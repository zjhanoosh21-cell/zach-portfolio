import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteConversation } from "@/app/actions";
import { Chat } from "@/components/chat";

export const dynamic = "force-dynamic";

export default async function AdvisorPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  const active = c
    ? await prisma.conversation.findUnique({
        where: { id: c },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 border-r border-line flex flex-col">
        <div className="px-4 py-4 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-ink">Conversations</h1>
          <Link
            href="/advisor"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-2 hover:bg-surface-2"
            title="New conversation"
          >
            <Plus size={14} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {conversations.length === 0 && (
            <p className="text-xs text-ink-3 px-2 py-2">
              Your conversations with Sage will appear here.
            </p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-1 rounded-lg ${
                conv.id === c ? "bg-accent-soft" : "hover:bg-surface-2"
              }`}
            >
              <Link
                href={`/advisor?c=${conv.id}`}
                className={`flex-1 min-w-0 px-2.5 py-2 text-xs font-medium truncate ${
                  conv.id === c ? "text-accent-strong" : "text-ink-2"
                }`}
              >
                {conv.title}
              </Link>
              <form action={deleteConversation}>
                <input type="hidden" name="id" value={conv.id} />
                <button
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-3 hover:text-critical cursor-pointer"
                  title="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              </form>
            </div>
          ))}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <Chat
          key={active?.id ?? "new"}
          conversationId={active?.id ?? null}
          initialMessages={
            active?.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              actions: m.toolSummary ? JSON.parse(m.toolSummary) : [],
            })) ?? []
          }
        />
      </div>
    </div>
  );
}
