import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JobStatusUpdater } from "@/components/job/job-status-updater";
import { JobSubmissions } from "@/components/job/job-submissions";
import { DiscussionPanel } from "@/components/discussion/discussion-panel";
import { JobAttachmentsManager } from "@/components/job/job-attachments-manager";
import { RecruiterPicker } from "@/components/job/recruiter-picker";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  // Only allow back nav to candidate pages (sanitize to prevent open redirect)
  const backHref = sp.back?.startsWith("/candidates/") ? sp.back : null;

  const [job, activeUsers] = await Promise.all([prisma.jobOrder.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      submissions: {
        orderBy: { createdAt: "desc" },
        include: {
          candidate: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              currentTitle: true,
              currentEmployer: true,
              aiCompositeScore: true,
              aiTier: true,
              resumeEmail: true,
              resumePhone: true,
              aiSummary: true,
              keySkills: true,
              practiceAreas: true,
              availabilityNotes: true,
              candidateLocation: true,
              yearsOfExperience: true,
              aiDetectedRoleType: true,
              status: true,
              notes: {
                orderBy: { createdAt: "desc" as const },
                take: 10,
                select: {
                  id: true,
                  content: true,
                  type: true,
                  createdAt: true,
                  author: { select: { name: true } },
                },
              },
            },
          },
          submittedBy: { select: { name: true } },
        },
      },
      activityLog: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { user: { select: { name: true } } },
      },
      attachments: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  }), prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })]);

  if (!job) notFound();

  const salaryRange = [
    job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : null,
    job.salaryMax ? `$${job.salaryMax.toLocaleString()}` : null,
  ].filter(Boolean).join(" – ");

  const matchCandidatesHref = `/candidates?status=ACTIVE${job.roleType ? `&role=${job.roleType}` : ""}`;

  return (
    <div className="space-y-6">
      <a href={backHref ?? "/jobs"} className="text-sm text-slate-500 hover:text-slate-800">
        {backHref ? "← Back to candidate" : "← Back to job orders"}
      </a>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {job.client ? (
              <Link href={`/clients/${job.client.id}`} className="hover:underline text-blue-600">
                {job.clientName}
              </Link>
            ) : (
              job.clientName
            )}
            {job.location ? ` · ${job.location}` : ""}
            {job.assignedTo && (
              <span className="text-slate-400"> · Assigned to {job.assignedTo.name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <JobStatusUpdater jobId={id} currentStatus={job.status} />
          <Link href={`/jobs/${id}/edit`} className="h-8 px-3 text-sm border border-slate-300 rounded hover:bg-slate-50 flex items-center">
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: job details */}
        <div className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Details</p>
            <dl className="space-y-2 text-sm">
              <DetailRow label="Type" value={job.jobType.replace(/_/g, " ")} />
              {job.roleType && <DetailRow label="Role" value={job.roleType.replace(/_/g, " ")} />}
              {salaryRange && <DetailRow label="Salary" value={salaryRange} />}
              <DetailRow
                label="Priority"
                value={job.priority === 1 ? "Urgent" : job.priority === 3 ? "Low" : "Normal"}
              />
              {job.targetFillDate && (
                <DetailRow
                  label="Target fill"
                  value={job.targetFillDate.toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                />
              )}
              <DetailRow
                label="Opened"
                value={job.openedAt.toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              />
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500 shrink-0">Recruiter</dt>
                <dd className="text-right">
                  <RecruiterPicker jobId={id} assignedTo={job.assignedTo} users={activeUsers} />
                </dd>
              </div>
            </dl>

            {job.practiceAreas.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1.5">Practice areas</p>
                <div className="flex flex-wrap gap-1">
                  {job.practiceAreas.map((a, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {job.requiredSkills.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1.5">Required skills</p>
                <div className="flex flex-wrap gap-1">
                  {job.requiredSkills.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {job.description && (
            <div className="rounded border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {job.internalNotes && (
            <div className="rounded border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Internal notes</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{job.internalNotes}</p>
            </div>
          )}

          {/* Interview schedule */}
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const withDates = job.submissions
              .filter((s) => s.interviewDate)
              .sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime());
            if (withDates.length === 0) return null;
            const upcoming = withDates.filter((s) => new Date(s.interviewDate!) >= today);
            const past = withDates.filter((s) => new Date(s.interviewDate!) < today);
            return (
              <div className="rounded border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">
                  Interview Schedule
                </p>
                <div className="space-y-2">
                  {upcoming.map((s) => {
                    const c = s.candidate;
                    const candidateName = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
                    const d = new Date(new Date(s.interviewDate!).toISOString().split("T")[0] + "T12:00:00");
                    return (
                      <div key={s.id} className="flex items-center gap-3 text-xs">
                        <span className="w-16 font-medium text-indigo-600 shrink-0">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <Link href={`/candidates/${c.id}`} className="font-medium text-slate-900 hover:text-[#1a6bbf] truncate">
                          {candidateName}
                        </Link>
                        <span className="text-slate-400 shrink-0">Interview</span>
                      </div>
                    );
                  })}
                  {past.map((s) => {
                    const c = s.candidate;
                    const candidateName = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
                    const d = new Date(new Date(s.interviewDate!).toISOString().split("T")[0] + "T12:00:00");
                    return (
                      <div key={s.id} className="flex items-center gap-3 text-xs opacity-50">
                        <span className="w-16 text-slate-400 shrink-0">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-slate-500 truncate line-through">{candidateName}</span>
                        <span className="text-slate-400 shrink-0">Interview</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: submission pipeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">
              Submissions ({job.submissions.length})
            </h2>
            <Link href={matchCandidatesHref} className="text-sm text-blue-600 hover:underline">
              Find matching candidates →
            </Link>
          </div>

          <JobSubmissions
            jobTitle={job.title}
            submissions={job.submissions.map((sub) => {
              const c = sub.candidate;
              const candidateName = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
              return {
                id: sub.id,
                status: sub.status,
                clientFeedback: sub.clientFeedback,
                offerAmount: sub.offerAmount,
                placementFee: sub.placementFee ? Number(sub.placementFee) : null,
                interviewDate: sub.interviewDate?.toISOString() ?? null,
                submittedByName: sub.submittedBy?.name ?? null,
                submittedAt: sub.createdAt.toISOString(),
                candidate: {
                  id: c.id,
                  name: candidateName,
                  candidateStatus: c.status,
                  currentTitle: c.currentTitle,
                  currentEmployer: c.currentEmployer,
                  resumeEmail: c.resumeEmail,
                  resumePhone: c.resumePhone,
                  aiCompositeScore: c.aiCompositeScore,
                  aiTier: c.aiTier,
                  aiSummary: c.aiSummary,
                  keySkills: c.keySkills,
                  practiceAreas: c.practiceAreas,
                  availabilityNotes: c.availabilityNotes,
                  candidateLocation: c.candidateLocation,
                  yearsOfExperience: c.yearsOfExperience,
                  aiDetectedRoleType: c.aiDetectedRoleType,
                  profileNotes: c.notes.map((n) => ({
                    id: n.id,
                    content: n.content,
                    type: n.type,
                    createdAt: n.createdAt.toISOString(),
                    authorName: n.author?.name ?? null,
                  })),
                },
              };
            })}
          />
        </div>

        {/* Activity feed */}
        {job.activityLog.length > 0 && (
          <div className="rounded border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Activity</p>
            <div className="space-y-2">
              {job.activityLog.map((entry) => (
                <div key={entry.id} className="flex gap-2 text-xs text-slate-600">
                  <span className="text-slate-300 shrink-0 mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="flex-1">{entry.description}</span>
                  {entry.user && (
                    <span className="text-slate-400 shrink-0">{entry.user.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Attachments
          </h2>
          <JobAttachmentsManager
            jobId={id}
            initialAttachments={job.attachments.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              mimeType: a.mimeType,
              uploadedAt: a.uploadedAt.toISOString(),
            }))}
          />
        </div>

        {/* Discussions */}
        <div id="discussion" className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Discussions
          </h2>
          <DiscussionPanel jobOrderId={id} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-400 shrink-0 w-20">{label}</dt>
      <dd className="text-slate-800 font-medium text-sm">{value}</dd>
    </div>
  );
}
