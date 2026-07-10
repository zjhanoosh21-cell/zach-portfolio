"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Prospect = { id: string; name: string; businessName: string | null };

export function CreateDealForm({ prospects }: { prospects: Prospect[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prospectId, setProspectId] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [retainerAmount, setRetainerAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prospectId) return;
    setLoading(true);
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prospectId,
        proposalAmount: proposalAmount ? parseInt(proposalAmount) : null,
        retainerAmount: retainerAmount ? parseInt(retainerAmount) : null,
        notes: notes || undefined,
      }),
    });
    setOpen(false);
    setProspectId("");
    setProposalAmount("");
    setRetainerAmount("");
    setNotes("");
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          New Deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Prospect *</Label>
            <select
              value={prospectId}
              onChange={(e) => setProspectId(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Select a prospect...</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.businessName ? ` — ${p.businessName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proposalAmount">Project Fee ($)</Label>
              <Input
                id="proposalAmount"
                type="number"
                min="0"
                value={proposalAmount}
                onChange={(e) => setProposalAmount(e.target.value)}
                placeholder="2500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retainerAmount">Monthly Retainer ($)</Label>
              <Input
                id="retainerAmount"
                type="number"
                min="0"
                value={retainerAmount}
                onChange={(e) => setRetainerAmount(e.target.value)}
                placeholder="200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Deal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
