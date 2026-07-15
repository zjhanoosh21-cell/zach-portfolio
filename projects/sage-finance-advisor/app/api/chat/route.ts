import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MODEL,
  buildSystemPrompt,
  advisorTools,
  executeAdvisorTool,
  type ToolAction,
} from "@/lib/advisor";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { conversationId, message } = (await req.json()) as {
    conversationId?: string;
    message: string;
  };

  // Hosted preview: the advisor calls a live Claude API key when self-hosted,
  // so it's switched off here rather than exposing a paid key publicly.
  if (process.env.DEMO_MODE === "1") {
    return Response.json(
      {
        error:
          "The live AI advisor is turned off in this hosted preview — it runs against a real Claude API key. The seeded conversation below shows what a session looks like; clone the repo and add your own ANTHROPIC_API_KEY to talk to it.",
      },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { error: "No Anthropic API key configured. Add ANTHROPIC_API_KEY to .env.local and restart." },
      { status: 400 }
    );
  }

  const client = new Anthropic();

  // Load or create the conversation and persist the user message up front.
  const conversation = conversationId
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : await prisma.conversation.create({
        data: { title: message.slice(0, 60) },
        include: { messages: true },
      });
  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }
  await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: message },
  });

  const system = await buildSystemPrompt();

  // Text-only history (assistant tool activity is summarized in toolSummary,
  // which we don't replay — the system prompt already carries current state).
  const history: Anthropic.MessageParam[] = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const actions: ToolAction[] = [];
      let assistantText = "";

      try {
        // Manual tool-use loop: stream text as it arrives; when Claude calls
        // tools, run them against the database and continue the turn.
        for (let iteration = 0; iteration < 12; iteration++) {
          const msgStream = client.messages.stream({
            model: MODEL,
            max_tokens: 8000,
            thinking: { type: "adaptive" },
            system,
            tools: advisorTools,
            messages,
          });

          msgStream.on("text", (delta) => {
            assistantText += delta;
            emit({ type: "text", text: delta });
          });

          const final = await msgStream.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason === "tool_use") {
            const toolUses = final.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            const results: Anthropic.ToolResultBlockParam[] = [];
            for (const tu of toolUses) {
              const { result, action } = await executeAdvisorTool(
                tu.name,
                tu.input as Record<string, unknown>
              );
              actions.push(action);
              emit({ type: "action", action });
              results.push({
                type: "tool_result",
                tool_use_id: tu.id,
                content: result,
              });
            }
            messages.push({ role: "user", content: results });
            continue;
          }
          if (final.stop_reason === "pause_turn") continue;
          break;
        }

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: assistantText,
            toolSummary: actions.length ? JSON.stringify(actions) : null,
          },
        });
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        emit({ type: "done", conversationId: conversation.id });
      } catch (e) {
        const msg =
          e instanceof Anthropic.APIError
            ? `Claude API error (${e.status}): ${e.message}`
            : e instanceof Error
              ? e.message
              : "Something went wrong";
        emit({ type: "error", error: msg, conversationId: conversation.id });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
