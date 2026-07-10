import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rm } from "fs/promises";
import { join, dirname } from "path";
import { resolveUploadPath } from "@/lib/upload-path";
import { checkPinBlocked, recordPinFailure, clearPinFailures } from "@/lib/pin-limiter";

const schema = z.object({ pin: z.string().regex(/^\d{4}$/) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isElevated = !!token.isAdmin || !!token.isManager;
  if (!isElevated) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const blocked = await checkPinBlocked(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });

  // Validate PIN
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.deletionPinHash) {
    return NextResponse.json({ error: "No deletion PIN has been set. Configure one in Settings first." }, { status: 403 });
  }

  const pinMatch = await bcrypt.compare(parsed.data.pin, settings.deletionPinHash);
  if (!pinMatch) {
    await recordPinFailure(req);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  await clearPinFailures(req);

  // Find candidate (include attachments so we can delete their files too)
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      resumeStoragePath: true,
      attachments: { select: { storagePath: true } },
    },
  });
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  // Delete resume file and its parent directory
  if (candidate.resumeStoragePath) {
    const absResumePath = resolveUploadPath(candidate.resumeStoragePath);
    if (absResumePath) {
      await rm(dirname(absResumePath), { recursive: true, force: true }).catch(() => {});
    }
  }

  // Delete each attachment file
  for (const att of candidate.attachments) {
    const absAttPath = resolveUploadPath(att.storagePath);
    if (absAttPath) await rm(absAttPath, { force: true }).catch(() => {});
  }

  // Clean up the candidate's uploads directory (covers attachments folder)
  await rm(join(process.cwd(), "uploads", "candidates", id), {
    recursive: true,
    force: true,
  }).catch(() => {});

  // Delete candidate (cascade handles notes, submissions, activityLog, attachments)
  await prisma.candidate.delete({ where: { id } });

  const name = candidate.displayName || [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Unknown";
  console.log(`[AUDIT] Candidate "${name}" (${id}) permanently deleted by user ${token.email ?? token.sub ?? "unknown"}`);

  return NextResponse.json({ success: true });
}
