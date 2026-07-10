"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Doc = {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export const DOCUMENT_CATEGORIES = [
  { key: "pricing", label: "Pricing & Packages" },
  { key: "contracts", label: "Contracts & Legal" },
  { key: "templates", label: "Email Templates" },
  { key: "sales", label: "Sales & Discovery" },
  { key: "delivery", label: "Delivery & Onboarding" },
  { key: "reference", label: "Reference & Research" },
  { key: "general", label: "General" },
] as const;

type CategoryKey = (typeof DOCUMENT_CATEGORIES)[number]["key"];

const CATEGORY_ICONS: Record<string, string> = {
  pricing: "💰",
  contracts: "📋",
  templates: "✉️",
  sales: "📞",
  delivery: "🚀",
  reference: "📚",
  general: "📄",
};

function getCategoryLabel(key: string) {
  return (
    DOCUMENT_CATEGORIES.find((c) => c.key === key)?.label ?? "General"
  );
}

function DocViewer({
  doc,
  onEdit,
  onDelete,
}: {
  doc: Doc;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {CATEGORY_ICONS[doc.category] ?? "📄"} {getCategoryLabel(doc.category)}
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{doc.title}</h2>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-5 overflow-auto">
        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
          {doc.content}
        </pre>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Last updated{" "}
        {new Date(doc.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

function DocEditor({
  doc,
  onSave,
  onCancel,
}: {
  doc: Partial<Doc>;
  onSave: (data: { title: string; category: string; content: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(doc.title ?? "");
  const [category, setCategory] = useState(doc.category ?? "general");
  const [content, setContent] = useState(doc.content ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), category, content });
    setSaving(false);
  }

  return (
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          className="font-semibold text-lg flex-1"
          autoFocus
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {CATEGORY_ICONS[c.key]} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[400px] p-4 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        placeholder="Document content... (plain text or markdown)"
      />
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          <Check className="h-3.5 w-3.5 mr-1" />
          {saving ? "Saving..." : "Save document"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function DocumentsHub({ initialDocs }: { initialDocs: Doc[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocs[0]?.id ?? null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null;

  const categories = [
    "all",
    ...Array.from(new Set(docs.map((d) => d.category))).sort(),
  ];

  const filteredDocs =
    categoryFilter === "all"
      ? docs
      : docs.filter((d) => d.category === categoryFilter);

  const groupedDocs: Record<string, Doc[]> = {};
  for (const doc of filteredDocs) {
    if (!groupedDocs[doc.category]) groupedDocs[doc.category] = [];
    groupedDocs[doc.category].push(doc);
  }

  async function handleSave(data: {
    title: string;
    category: string;
    content: string;
  }) {
    if (creating) {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const created = await res.json();
      setDocs((prev) => [...prev, created]);
      setSelectedId(created.id);
      setCreating(false);
    } else if (editingId) {
      const res = await fetch(`/api/documents/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setDocs((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
      setEditingId(null);
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) {
      const remaining = docs.filter((d) => d.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
    router.refresh();
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setSelectedId(null);
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
            <FolderOpen className="h-5 w-5 text-slate-500" />
            Documents
          </h1>
          <Button size="sm" variant="outline" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1 mb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                categoryFilter === cat
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {cat === "all" ? "All" : CATEGORY_ICONS[cat] ?? "📄"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {Object.entries(groupedDocs)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, catDocs]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 px-1">
                  {CATEGORY_ICONS[category] ?? "📄"}{" "}
                  {getCategoryLabel(category)}
                </p>
                <div className="space-y-0.5">
                  {catDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedId(doc.id);
                        setCreating(false);
                        setEditingId(null);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors truncate",
                        selectedId === doc.id && !creating && !editingId
                          ? "bg-slate-800 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5 inline mr-1.5 opacity-60" />
                      {doc.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {filteredDocs.length === 0 && (
            <p className="text-xs text-slate-400 px-1">No documents yet.</p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-slate-200 flex-shrink-0" />

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {creating ? (
          <DocEditor
            doc={{ category: "general", content: "", title: "" }}
            onSave={handleSave}
            onCancel={() => setCreating(false)}
          />
        ) : editingId && selectedDoc ? (
          <DocEditor
            doc={selectedDoc}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
          />
        ) : selectedDoc ? (
          <DocViewer
            doc={selectedDoc}
            onEdit={() => setEditingId(selectedDoc.id)}
            onDelete={() => handleDelete(selectedDoc.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <FolderOpen className="h-12 w-12 text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">
              Select a document or create a new one.
            </p>
            <Button className="mt-4" variant="outline" onClick={startCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
