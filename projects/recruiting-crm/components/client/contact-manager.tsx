"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
}

interface Props {
  clientId: string;
  contacts: Contact[];
}

const BLANK = { name: "", title: "", email: "", phone: "", isPrimary: false, notes: "" };

export function ContactManager({ clientId, contacts }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "add" | { edit: Contact }>("idle");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(BLANK);

  const set = (field: keyof typeof BLANK) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: field === "isPrimary" ? (e.target as HTMLInputElement).checked : e.target.value }));

  function openAdd() {
    setForm(BLANK);
    setError("");
    setMode("add");
  }

  function openEdit(c: Contact) {
    setForm({
      name: c.name,
      title: c.title ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      isPrimary: c.isPrimary,
      notes: c.notes ?? "",
    });
    setError("");
    setMode({ edit: c });
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload = {
      name: form.name,
      title: form.title || null,
      email: form.email || null,
      phone: form.phone || null,
      isPrimary: form.isPrimary,
      notes: form.notes || null,
    };

    const isEdit = typeof mode === "object" && "edit" in mode;
    const url = isEdit
      ? `/api/clients/${clientId}/contacts/${(mode as { edit: Contact }).edit.id}`
      : `/api/clients/${clientId}/contacts`;

    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Failed to save contact.");
      return;
    }

    setMode("idle");
    router.refresh();
  }

  async function handleDelete(contactId: string) {
    setDeleting(contactId);
    await fetch(`/api/clients/${clientId}/contacts/${contactId}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  const editId = typeof mode === "object" && "edit" in mode ? (mode as { edit: Contact }).edit.id : null;

  return (
    <div className="space-y-3">
      {contacts.length === 0 && mode === "idle" && (
        <p className="text-sm text-slate-400">No contacts added yet.</p>
      )}

      {contacts.map((contact) =>
        editId === contact.id ? (
          <ContactFormInline
            key={contact.id}
            form={form}
            set={set}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={() => setMode("idle")}
            title="Edit contact"
            submitLabel="Save changes"
          />
        ) : (
          <div key={contact.id} className="text-sm group relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{contact.name}</span>
                  {contact.isPrimary && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Primary
                    </span>
                  )}
                </div>
                {contact.title && (
                  <p className="text-slate-500 text-xs mt-0.5">{contact.title}</p>
                )}
                <div className="mt-1 space-y-0.5">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 hover:underline"
                    >
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-slate-500 hover:underline"
                    >
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(contact)}
                  className="text-xs px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  disabled={deleting === contact.id}
                  className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting === contact.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {mode === "add" && (
        <ContactFormInline
          form={form}
          set={set}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={() => setMode("idle")}
          title="New contact"
          submitLabel="Add contact"
        />
      )}

      {mode === "idle" && (
        <div className="mt-2 pt-3 border-t border-slate-100">
          <button
            onClick={openAdd}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add contact
          </button>
        </div>
      )}
    </div>
  );
}

function ContactFormInline({
  form,
  set,
  saving,
  error,
  onSave,
  onCancel,
  title,
  submitLabel,
}: {
  form: typeof BLANK;
  set: (field: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
  error: string;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  submitLabel: string;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={set("name")}
            required
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <input
            value={form.title}
            onChange={set("title")}
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="HR Manager"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="jane@firm.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={set("phone")}
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="(312) 555-0100"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isPrimary}
          onChange={set("isPrimary")}
          className="rounded"
        />
        Primary contact
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="h-8 px-4 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 text-xs text-slate-500 border border-slate-300 rounded hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
