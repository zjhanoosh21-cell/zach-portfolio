import { Download, KeyRound, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { saveProfile } from "@/app/actions";
import { Card, CardHeader, inputClass, buttonPrimary, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const field = "space-y-1";
const labelClass = "text-xs font-medium text-ink-2";

export default async function SettingsPage() {
  const profile = await prisma.profile.findUnique({ where: { id: "main" } });
  const [noteCount, msgCount] = await Promise.all([
    prisma.advisorNote.count(),
    prisma.message.count(),
  ]);
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Settings</h1>

      <Card className="mb-4">
        <CardHeader
          title="About you"
          subtitle="Sage uses this to personalize advice. You can also just tell Sage these things in chat."
        />
        <form action={saveProfile} className="px-5 pb-5 pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelClass}>Name</label>
              <input name="name" defaultValue={profile?.name ?? ""} className={inputClass} />
            </div>
            <div className={field}>
              <label className={labelClass}>Birth year</label>
              <input name="birthYear" type="number" defaultValue={profile?.birthYear ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelClass}>Marital status</label>
              <select name="maritalStatus" defaultValue={profile?.maritalStatus ?? ""} className={inputClass}>
                <option value="">—</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="partnered">Partnered</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div className={field}>
              <label className={labelClass}>Dependents</label>
              <input name="dependents" type="number" defaultValue={profile?.dependents ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelClass}>State</label>
              <input name="state" defaultValue={profile?.state ?? ""} placeholder="e.g. Michigan" className={inputClass} />
            </div>
            <div className={field}>
              <label className={labelClass}>Employment</label>
              <input name="employmentStatus" defaultValue={profile?.employmentStatus ?? ""} placeholder="e.g. Full-time" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelClass}>Risk tolerance</label>
              <select name="riskTolerance" defaultValue={profile?.riskTolerance ?? ""} className={inputClass}>
                <option value="">—</option>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
            <div className={field}>
              <label className={labelClass}>Target retirement age</label>
              <input name="retirementAge" type="number" defaultValue={profile?.retirementAge ?? ""} className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className={buttonPrimary + " btn-accent-text"}>Save profile</button>
          </div>
        </form>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Claude connection" />
        <div className="px-5 pb-5 pt-1">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-ink-3" />
            {hasKey ? (
              <Badge tone="good">API key configured</Badge>
            ) : (
              <Badge tone="serious">No API key found</Badge>
            )}
          </div>
          {!hasKey && (
            <p className="text-xs text-ink-2 mt-2 leading-relaxed">
              Sage&apos;s chat runs on the Claude API. Create a key at{" "}
              <span className="font-medium">platform.claude.com</span>, then add{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">
                ANTHROPIC_API_KEY=sk-ant-…
              </code>{" "}
              to <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">.env.local</code>{" "}
              in the project folder and restart the app.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Your data" />
        <div className="px-5 pb-5 pt-1 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldCheck size={15} className="text-good-text mt-0.5 shrink-0" />
            <p className="text-xs text-ink-2 leading-relaxed">
              Everything lives in a local SQLite database on this computer
              (<code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">prisma/dev.db</code>).
              Chat messages are sent to the Claude API to generate responses; nothing else
              leaves your machine. Sage has saved {noteCount} memory note{noteCount === 1 ? "" : "s"} and{" "}
              {msgCount} chat message{msgCount === 1 ? "" : "s"}.
            </p>
          </div>
          <a
            href="/api/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 transition-colors"
          >
            <Download size={14} /> Export everything as JSON
          </a>
        </div>
      </Card>
    </div>
  );
}
