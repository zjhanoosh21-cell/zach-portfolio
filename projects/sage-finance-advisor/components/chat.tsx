"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, Leaf, Loader2 } from "lucide-react";

type ToolAction = { tool: string; summary: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions: ToolAction[];
};

const SUGGESTIONS = [
  "Let's do a full financial checkup — interview me",
  "Help me figure out my goals",
  "Build me a monthly budget",
  "What should I do with my extra cash?",
];

/** Minimal markdown: paragraphs, bullets, **bold**. Keeps the bundle tiny. */
function renderMarkdownLite(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n");
    const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l) || l.trim() === "");
    const bold = (s: string) =>
      s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      );
    if (isList && lines.some((l) => l.trim())) {
      return (
        <ul key={bi}>
          {lines
            .filter((l) => l.trim())
            .map((l, li) => (
              <li key={li}>{bold(l.replace(/^\s*[-*•]\s+/, ""))}</li>
            ))}
        </ul>
      );
    }
    return (
      <p key={bi}>
        {lines.map((l, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {bold(l)}
          </span>
        ))}
      </p>
    );
  });
}

export function Chat({
  conversationId: initialConversationId,
  initialMessages,
}: {
  conversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content: trimmed, actions: [] },
      { id: `a-${Date.now()}`, role: "assistant", content: "", actions: [] },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newConversationId: string | null = null;

      const apply = (fn: (last: ChatMessage) => ChatMessage) =>
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = fn(copy[copy.length - 1]);
          return copy;
        });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "text") {
            apply((last) => ({ ...last, content: last.content + event.text }));
          } else if (event.type === "action") {
            apply((last) => ({ ...last, actions: [...last.actions, event.action] }));
          } else if (event.type === "done") {
            newConversationId = event.conversationId;
          } else if (event.type === "error") {
            newConversationId = event.conversationId ?? null;
            setError(event.error);
          }
        }
      }

      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        window.history.replaceState(null, "", `/advisor?c=${newConversationId}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
    } finally {
      setBusy(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {empty ? (
            <div className="text-center pt-24">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong mb-4">
                <Leaf size={22} />
              </div>
              <h2 className="text-lg font-semibold text-ink">
                What&apos;s on your mind financially?
              </h2>
              <p className="text-sm text-ink-2 mt-2 max-w-md mx-auto">
                Sage knows your full picture — accounts, budget, and goals — and
                updates them as you talk.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink-2 hover:border-accent hover:text-ink transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent-strong text-white btn-accent-text px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-strong mt-0.5">
                      <Leaf size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {m.content === "" && busy ? (
                        <div className="flex items-center gap-2 text-ink-3 text-sm py-1.5">
                          <Loader2 size={14} className="animate-spin" /> Sage is thinking…
                        </div>
                      ) : (
                        <div className="chat-bubble text-sm leading-relaxed text-ink">
                          {renderMarkdownLite(m.content)}
                        </div>
                      )}
                      {m.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {m.actions.map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-strong"
                            >
                              <Check size={11} /> {a.summary}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
              <div ref={bottomRef} />
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-critical/30 bg-[rgba(208,59,59,0.06)] px-4 py-3 text-sm text-critical">
              {error}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-line bg-surface">
        <form
          className="max-w-2xl mx-auto px-6 py-4 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Message Sage…"
            className="flex-1 resize-none rounded-xl border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/40 max-h-40"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-strong text-white btn-accent-text disabled:opacity-40 cursor-pointer"
            title="Send"
          >
            <ArrowUp size={16} />
          </button>
        </form>
        <p className="text-center text-[11px] text-ink-3 pb-3 -mt-1">
          Sage is educational guidance, not licensed financial advice.
        </p>
      </div>
    </div>
  );
}
