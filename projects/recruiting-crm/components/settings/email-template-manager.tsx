"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailTemplateManagerProps {
  initialTemplates: Template[];
}

export function EmailTemplateManager({ initialTemplates }: EmailTemplateManagerProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openNew() {
    setEditingId(null);
    setName(""); setSubject(""); setBody("");
    setError("");
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditingId(t.id);
    setName(t.name); setSubject(t.subject); setBody(t.body);
    setError("");
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setName(""); setSubject(""); setBody("");
    setError("");
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/email-templates/${editingId}` : "/api/email-templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, body }),
      });
      if (!res.ok) { setError("Failed to save template."); return; }
      const saved: Template = await res.json();
      if (editingId) {
        setTemplates((prev) => prev.map((t) => (t.id === editingId ? saved : t)));
      } else {
        setTemplates((prev) => [...prev, saved]);
      }
      cancelForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 && !showForm && (
        <p className="text-sm text-slate-400">No templates yet. Create one to pre-fill submission emails.</p>
      )}

      {templates.length > 0 && (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.subject}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs text-[#1a6bbf] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">{editingId ? "Edit Template" : "New Template"}</p>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Template Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Direct Hire Submission"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Email Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="e.g. Candidate Submission – {{name}}"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={6}
              placeholder="Write your template body here…"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6bbf] resize-y"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#1a6bbf] text-white text-sm font-medium rounded hover:bg-[#155da3] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Template"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openNew}
          className="text-sm text-[#1a6bbf] hover:underline"
        >
          + New Template
        </button>
      )}
    </div>
  );
}
