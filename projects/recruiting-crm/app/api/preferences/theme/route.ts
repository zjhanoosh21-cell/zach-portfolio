import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_THEMES = new Set(["default", "emerald", "violet", "rose", "amber", "slate"]);

// GET — return the current user's saved theme
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ theme: "default" });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { colorTheme: true },
  });

  return NextResponse.json({ theme: user?.colorTheme ?? "default" });
}

// POST — save the current user's theme
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: "No user ID in session" }, { status: 400 });

  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const theme = body.theme ?? "default";
  if (!VALID_THEMES.has(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { colorTheme: theme === "default" ? null : theme },
  });

  return NextResponse.json({ success: true, theme });
}
