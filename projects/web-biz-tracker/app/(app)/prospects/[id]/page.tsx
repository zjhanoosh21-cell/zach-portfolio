import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { InlineStatusUpdater } from "@/components/prospect/inline-status-updater";
import { StatusBadge } from "@/components/prospect/status-badge";
import { timeAgo, formatDollars } from "@/lib/utils";
import { SOURCE_LABELS, ASSIGNEE_COLORS, type ProspectSource } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [prospect, users] = await Promise.all([
    prisma.prospect.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
        deal: true,
        feedNotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  if (!prospect) notFound();

  const assigneeKey = prospect.assignee?.name.toLowerCase().split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/prospects"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{prospect.name}</h1>
          {prospect.businessName && (
            <p className="text-slate-500">{prospect.businessName}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status + meta */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <InlineStatusUpdater
                prospectId={prospect.id}
                currentStatus={prospect.status}
              />
              <span className="text-xs text-slate-400">
                {SOURCE_LABELS[prospect.source as ProspectSource] ??
                  prospect.source}
              </span>
              {prospect.assignee && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    ASSIGNEE_COLORS[assigneeKey] ??
                      "bg-slate-100 text-slate-600"
                  )}
                >
                  {prospect.assignee.name}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {prospect.email && (
                <>
                  <dt className="text-slate-500">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${prospect.email}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {prospect.email}
                    </a>
                  </dd>
                </>
              )}
              {prospect.phone && (
                <>
                  <dt className="text-slate-500">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${prospect.phone}`}
                      className="flex items-center gap-1 text-slate-700 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {prospect.phone}
                    </a>
                  </dd>
                </>
              )}
              {prospect.website && (
                <>
                  <dt className="text-slate-500">Current Site</dt>
                  <dd>
                    <a
                      href={prospect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {prospect.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </>
              )}
              {prospect.industry && (
                <>
                  <dt className="text-slate-500">Industry</dt>
                  <dd className="text-slate-700">{prospect.industry}</dd>
                </>
              )}
              {prospect.followUpDate && (
                <>
                  <dt className="text-slate-500">Follow-up</dt>
                  <dd
                    className={cn(
                      "text-slate-700",
                      new Date(prospect.followUpDate) < new Date() &&
                        "text-red-500 font-medium"
                    )}
                  >
                    {new Date(prospect.followUpDate).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  </dd>
                </>
              )}
              {prospect.outreachSentAt && (
                <>
                  <dt className="text-slate-500">Email Sent</dt>
                  <dd className="text-slate-700">
                    {timeAgo(new Date(prospect.outreachSentAt))}
                    {prospect.outreachTemplate && (
                      <span className="text-slate-400 ml-1">
                        · {prospect.outreachTemplate}
                      </span>
                    )}
                  </dd>
                </>
              )}
              <dt className="text-slate-500">Added</dt>
              <dd className="text-slate-700">
                {timeAgo(new Date(prospect.createdAt))}
              </dd>
            </dl>

            {prospect.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 font-medium mb-1">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {prospect.notes}
                </p>
              </div>
            )}
          </div>

          {/* AI Mockup */}
          {(prospect.mockupPath || prospect.mockupUrl) && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3">
                Website Mockup Sent
              </h2>
              <img
                src={prospect.mockupPath ?? prospect.mockupUrl ?? ""}
                alt="Website mockup sent in outreach email"
                className="w-full rounded-lg border border-slate-200 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Right: Deal + Notes */}
        <div className="space-y-4">
          {/* Deal panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Deal</h2>
            {prospect.deal ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={prospect.deal.status} />
                </div>
                {prospect.deal.proposalAmount != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proposal</span>
                    <span className="font-medium text-slate-800">
                      {formatDollars(prospect.deal.proposalAmount)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <CreateDealButton prospectId={prospect.id} />
            )}
          </div>

          {/* Prospect notes feed */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Notes</h2>
            <ProspectNotes prospectId={prospect.id} notes={prospect.feedNotes} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateDealButton({ prospectId }: { prospectId: string }) {
  return (
    <p className="text-sm text-slate-400">
      No deal yet.{" "}
      <span className="text-slate-500">
        Create one from the{" "}
        <Link href="/pipeline" className="text-blue-600 hover:underline">
          Pipeline
        </Link>{" "}
        page.
      </span>
    </p>
  );
}

function ProspectNotes({
  prospectId,
  notes,
}: {
  prospectId: string;
  notes: {
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; name: string } | null;
  }[];
}) {
  return (
    <div className="space-y-3">
      {notes.length === 0 && (
        <p className="text-sm text-slate-400">No notes yet.</p>
      )}
      {notes.map((n) => (
        <div key={n.id} className="text-sm">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-slate-700">
              {n.author?.name ?? "Unknown"}
            </span>
            <span className="text-slate-400 text-xs">
              {timeAgo(new Date(n.createdAt))}
            </span>
          </div>
          <p className="text-slate-600 whitespace-pre-wrap">{n.content}</p>
        </div>
      ))}
      <AddNoteForm prospectId={prospectId} />
    </div>
  );
}

import AddNoteFormClient from "@/components/feed/add-note-form-client";

function AddNoteForm({ prospectId }: { prospectId: string }) {
  return <AddNoteFormClient prospectId={prospectId} />;
}
