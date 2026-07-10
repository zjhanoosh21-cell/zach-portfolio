import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AddNoteFormClient from "@/components/feed/add-note-form-client";
import { timeAgo } from "@/lib/utils";
import { ASSIGNEE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function FeedPage() {
  const notes = await prisma.feedNote.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { id: true, name: true } },
      prospect: { select: { id: true, name: true, businessName: true } },
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Feed</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Shared notes and updates between you and James.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <AddNoteFormClient />
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No notes yet. Post your first update above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const authorKey =
              note.author?.name.toLowerCase().split(" ")[0] ?? "";
            return (
              <div
                key={note.id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      ASSIGNEE_COLORS[authorKey] ??
                        "bg-slate-100 text-slate-600"
                    )}
                  >
                    {note.author?.name ?? "Unknown"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {timeAgo(new Date(note.createdAt))}
                  </span>
                  {note.prospect && (
                    <Link
                      href={`/prospects/${note.prospect.id}`}
                      className="text-xs text-blue-500 hover:underline ml-auto"
                    >
                      re: {note.prospect.name}
                      {note.prospect.businessName
                        ? ` — ${note.prospect.businessName}`
                        : ""}
                    </Link>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
