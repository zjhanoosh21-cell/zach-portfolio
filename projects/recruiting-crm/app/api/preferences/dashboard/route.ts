import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DashboardSection = {
  id: "priority_calls" | "needs_your_attention" | "new_candidates";
  visible: boolean;
  collapsed: boolean;
};

export const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: "priority_calls",       visible: true, collapsed: false },
  { id: "needs_your_attention", visible: true, collapsed: false },
  { id: "new_candidates",       visible: true, collapsed: false },
];

function parseSections(raw: unknown): DashboardSection[] {
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

  // Ensure all three sections are present (fill in missing ones at the end)
  const presentIds = new Set(parsed.map((s) => s.id));
  for (const def of DEFAULT_SECTIONS) {
    if (!presentIds.has(def.id)) parsed.push({ ...def });
  }

  return parsed;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ sections: DEFAULT_SECTIONS });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dashboardPrefs: true },
  });

  return NextResponse.json({ sections: parseSections(user?.dashboardPrefs) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: "No user ID in session" }, { status: 400 });

  let body: { sections?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sections = parseSections({ sections: body.sections });

  await prisma.user.update({
    where: { id: userId },
    data: { dashboardPrefs: { sections } },
  });

  return NextResponse.json({ success: true, sections });
}
