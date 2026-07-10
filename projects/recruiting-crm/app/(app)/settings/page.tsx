import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PasswordChange } from "@/components/settings/password-change";
import { PinManager } from "@/components/settings/pin-manager";
import { UserManager } from "@/components/settings/user-manager";
import { ExportManager } from "@/components/settings/export-manager";
import { EmailTemplateManager } from "@/components/settings/email-template-manager";
import { GeneralSettings } from "@/components/settings/general-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { ThemePicker } from "@/components/settings/theme-picker";
import { DashboardLayout } from "@/components/settings/dashboard-layout";
import { DEFAULT_SECTIONS } from "@/app/api/preferences/dashboard/route";
import type { DashboardSection } from "@/app/api/preferences/dashboard/route";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const { tab: tabParam } = await searchParams;

  const userId = (session?.user as { id?: string })?.id;

  const [settings, apiKeys, users, emailTemplates, currentUser] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    prisma.apiKey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, isActive: true, isAdmin: true, isManager: true, createdAt: true },
    }),
    prisma.emailTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { dashboardPrefs: true } })
      : Promise.resolve(null),
  ]);

  function parseDashboardSections(raw: unknown): DashboardSection[] {
    if (!raw || typeof raw !== "object") return DEFAULT_SECTIONS;
    const data = raw as { sections?: unknown };
    if (!Array.isArray(data.sections)) return DEFAULT_SECTIONS;
    const validIds = new Set(["priority_calls", "needs_your_attention", "new_candidates"]);
    const parsed = data.sections.filter(
      (s): s is DashboardSection =>
        s && typeof s === "object" &&
        validIds.has((s as DashboardSection).id) &&
        typeof (s as DashboardSection).visible === "boolean" &&
        typeof (s as DashboardSection).collapsed === "boolean"
    );
    const presentIds = new Set(parsed.map((s) => s.id));
    for (const def of DEFAULT_SECTIONS) {
      if (!presentIds.has(def.id)) parsed.push({ ...def });
    }
    return parsed;
  }

  const dashboardSections = parseDashboardSections(currentUser?.dashboardPrefs);

  const hasDeletionPin = !!settings?.deletionPinHash;
  const currentUserId = (session?.user as { id?: string })?.id ?? "";
  const currentUserIsAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin ?? false;
  const currentUserIsManager = (session?.user as { isManager?: boolean })?.isManager ?? false;
  const isAtLeastManager = currentUserIsAdmin || currentUserIsManager;
  const defaultTab = isAtLeastManager ? "general" : "security";
  const tab = tabParam ?? defaultTab;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Account and system settings</p>
      </div>

      <SettingsTabs defaultTab={defaultTab} />

      {/* ── Appearance tab ── */}
      {tab === "appearance" && (
        <div className="space-y-10">
          <Section
            title="Appearance"
            description="Customize the look of your CRM. Preferences are saved to this browser."
          >
            <ThemePicker />
          </Section>

          <Section
            title="Dashboard Layout"
            description="Choose which sections appear on your dashboard and in what order. Changes are saved per user."
          >
            <DashboardLayout initialSections={dashboardSections} />
          </Section>
        </div>
      )}

      {/* ── General tab ── */}
      {tab === "general" && (
        <div className="space-y-10">
          <Section
            title="General"
            description="Company-wide settings. Only admins can change these."
          >
            <GeneralSettings
              companyName={settings?.companyName ?? "Corporate Recruiters Inc."}
              intakeEnabled={settings?.intakeEnabled ?? true}
              aiScoringEnabled={settings?.aiScoringEnabled ?? true}
              hasDeletionPin={hasDeletionPin}
              isAdmin={currentUserIsAdmin}
            />
          </Section>

          <Section
            title="Team Members"
            description="Manage who has access to the CRM. Deactivated users cannot log in. To reset a password, use the button next to their name."
          >
            <UserManager
              users={users}
              currentUserId={currentUserId}
              isAdmin={currentUserIsAdmin}
              isManager={currentUserIsManager}
            />
          </Section>
        </div>
      )}

      {/* ── Security tab ── */}
      {tab === "security" && (
        <div className="space-y-10">
          <Section title="Change Password" description="Update your login password. Minimum 8 characters.">
            <PasswordChange />
          </Section>

          <Section
            title="Candidate Deletion PIN"
            description="A 4-digit PIN required to permanently delete a candidate record. Keep this secure — anyone with the PIN can permanently remove data."
          >
            <PinManager hasDeletionPin={hasDeletionPin} isAdmin={currentUserIsAdmin} />
          </Section>

          <Section
            title="Data Export"
            description="Requires the 4-digit admin PIN. CSV files open directly in Excel or Google Sheets."
          >
            <ExportManager hasDeletionPin={hasDeletionPin} isElevated={isAtLeastManager} />
            <p className="text-xs text-slate-400 mt-3">
              Tip: For a full database backup (including notes and activity history), contact your system administrator to run a server-level backup after deployment.
            </p>
          </Section>
        </div>
      )}

      {/* ── Integrations tab ── */}
      {tab === "integrations" && (
        <div className="space-y-10">
          <Section
            title="Submission Email Templates"
            description="Reusable email templates for candidate submissions. Templates can be loaded when drafting submission emails from a job order."
          >
            <EmailTemplateManager initialTemplates={emailTemplates} />
          </Section>

          <Section title="n8n API Keys" description="Read-only. These keys authorize the n8n intake webhook. To generate a new key, contact your administrator.">
            {apiKeys.length === 0 ? (
              <p className="text-sm text-slate-400">No active API keys.</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{key.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {key.prefix}••••••••••••••••••••••••••••••••••••••••
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>Created {key.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      {key.lastUsedAt && (
                        <p className="mt-0.5">Last used {key.lastUsedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}


function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
