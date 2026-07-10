"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCES,
  SOURCE_LABELS,
} from "@/lib/constants";

type User = { id: string; name: string };
type ProspectData = {
  name?: string;
  businessName?: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  status?: string;
  source?: string;
  assigneeId?: string | null;
  followUpDate?: string | null;
};

export function ProspectForm({
  defaultValues,
  users,
  onSave,
}: {
  defaultValues?: ProspectData;
  users: User[];
  onSave?: (prospect: ProspectData) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProspectData>({
    name: "",
    businessName: "",
    industry: "",
    email: "",
    phone: "",
    website: "",
    notes: "",
    status: "scraped",
    source: "manual",
    assigneeId: null,
    followUpDate: null,
    ...defaultValues,
  });
  const [loading, setLoading] = useState(false);

  function setField(key: keyof ProspectData, value: string | null) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = { ...form };
    if (body.followUpDate) {
      body.followUpDate = new Date(body.followUpDate).toISOString();
    }
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      onSave?.(data);
      router.push(`/prospects/${data.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Contact Name *</Label>
          <Input
            id="name"
            value={form.name ?? ""}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={form.businessName ?? ""}
            onChange={(e) => setField("businessName", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={form.industry ?? ""}
            onChange={(e) => setField("industry", e.target.value)}
            placeholder="e.g. Legal, Restaurant"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            value={form.website ?? ""}
            onChange={(e) => setField("website", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status ?? "scraped"}
            onValueChange={(v) => setField("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PROSPECT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select
            value={form.source ?? "manual"}
            onValueChange={(v) => setField("source", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assigned To</Label>
          <Select
            value={form.assigneeId ?? ""}
            onValueChange={(v) => setField("assigneeId", v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="followUpDate">Follow-up Date</Label>
        <Input
          id="followUpDate"
          type="date"
          value={
            form.followUpDate
              ? new Date(form.followUpDate).toISOString().split("T")[0]
              : ""
          }
          onChange={(e) =>
            setField("followUpDate", e.target.value ? e.target.value : null)
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Prospect"}
      </Button>
    </form>
  );
}
