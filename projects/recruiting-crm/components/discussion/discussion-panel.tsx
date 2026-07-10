"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface User {
  id: string;
  name: string;
}

interface DiscussionItem {
  id: string;
  content: string;
  createdAt: string;
  authorName: string | null;
}

interface Props {
  candidateId?: string;
  jobOrderId?: string;
}

export function DiscussionPanel({ candidateId, jobOrderId }: Props) {
  const apiBase = candidateId
    ? `/api/candidates/${candidateId}/discussions`
    : `/api/jobs/${jobOrderId}/discussions`;

  const [items, setItems] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // @mention
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset keyboard selection when mention list changes
  useEffect(() => { setMentionIndex(0); }, [mentionQuery]);

  const filteredMentions = mentionQuery !== null
    ? allUsers.filter((u) =>
        u.name.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    setLoading(true);
    fetch(apiBase)
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => { setError("Failed to load discussions."); setLoading(false); });

    fetch("/api/users")
      .then((r) => r.json())
      .then(setAllUsers)
      .catch((e) => console.error("[DiscussionPanel] Failed to load users:", e));
  }, [apiBase]);

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    // Detect @mention trigger
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf("@");

    if (atIdx !== -1) {
      const fragment = textBefore.slice(atIdx + 1);
      // Only trigger if no space in fragment and @ is at word boundary
      if (!fragment.includes(" ") && (atIdx === 0 || /\s/.test(val[atIdx - 1]))) {
        setMentionQuery(fragment);
        setMentionStart(atIdx);
        return;
      }
    }
    setMentionQuery(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1));
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        setMentionIndex((i) => Math.max(i - 1, 0));
        e.preventDefault();
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        insertMention(filteredMentions[mentionIndex]);
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  }

  function insertMention(user: User) {
    const before = content.slice(0, mentionStart);
    const after = content.slice(textareaRef.current?.selectionStart ?? mentionStart + 1 + (mentionQuery?.length ?? 0));
    const inserted = `@${user.name} `;
    setContent(before + inserted + after);
    setMentionQuery(null);
    setMentionedUserIds((prev) => prev.includes(user.id) ? prev : [...prev, user.id]);
    // Refocus
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + inserted.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, mentionedUserIds }),
      });
      if (!res.ok) throw new Error("Failed");
      const newItem = await res.json();
      setItems((prev) => [newItem, ...prev]);
      setContent("");
      setMentionedUserIds([]);
    } catch {
      setError("Failed to post. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [content, mentionedUserIds, apiBase]);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // Highlight @mentions in content
  function renderContent(text: string) {
    const parts = text.split(/(@\w[\w\s]*)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="text-[#1a6bbf] font-medium">{part}</span>
      ) : (
        part
      )
    );
  }

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Add a discussion note… Use @ to mention a teammate"
          aria-label="Discussion message"
          rows={3}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a6bbf] resize-none"
        />

        {/* @mention dropdown */}
        {mentionQuery !== null && filteredMentions.length > 0 && (
          <div className="absolute left-0 z-50 mt-0.5 w-52 rounded border border-slate-200 bg-white shadow-lg py-1">
            {filteredMentions.map((u, idx) => (
              <button
                key={u.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                onMouseEnter={() => setMentionIndex(idx)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 text-left ${idx === mentionIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}
              >
                <span className="h-5 w-5 rounded-full bg-[#1a6bbf] flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-white">{u.name[0]}</span>
                </span>
                {u.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-slate-400">Cmd+Enter to post</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="h-7 px-3 text-xs font-medium bg-[#1a6bbf] text-white rounded hover:bg-[#155a9e] disabled:opacity-40"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Thread */}
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No discussions yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2.5">
              <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-slate-600">
                  {item.authorName ? item.authorName[0].toUpperCase() : "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-800">
                    {item.authorName ?? "Unknown"}
                  </span>
                  <span className="text-[11px] text-slate-400">{timeAgo(item.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5 leading-relaxed break-words">
                  {renderContent(item.content)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
