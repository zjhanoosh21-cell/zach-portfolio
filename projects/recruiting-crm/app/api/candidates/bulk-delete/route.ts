import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rm } from "fs/promises";
import { join, dirname } from "path";
import { resolveUploadPath } from "@/lib/upload-path";
import { checkPinBlocked, recordPinFailure, clearPinFailures } from "@/lib/pin-limiter";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  pin: z.string().regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isElevated = !!token.isAdmin || !!token.isManager;
  if (!isElevated) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const blocked = await checkPinBlocked(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { ids, pin } = parsed.data;

  // Validate PIN
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.deletionPinHash) {
    return NextResponse.json({ error: "No deletion PIN configured. Set one in Settings first." }, { status: 403 });
  }
  const pinMatch = await bcrypt.compare(pin, settings.deletionPinHash);
  if (!pinMatch) {
    await recordPinFailure(req);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  await clearPinFailures(req);

  // Fetch candidates with resume paths and attachment paths
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      resumeStoragePath: true,
      attachments: { select: { storagePath: true } },
    },
  });

  // Delete all files for each candidate
  for (const c of candidates) {
    // Delete resume file and its parent directory
    if (c.resumeStoragePath) {
      const absResumePath = resolveUploadPath(c.resumeStoragePath);
      if (absResumePath) {
        await rm(dirname(absResumePath), { recursive: true, force: true }).catch(() => {});
      }
    }
    // Delete attachment files
    for (const att of c.attachments) {
      const absAttPath = resolveUploadPath(att.storagePath);
      if (absAttPath) await rm(absAttPath, { force: true }).catch(() => {});
    }
    // Clean up the candidate's uploads directory (covers attachments folder)
    await rm(join(process.cwd(), "uploads", "candidates", c.id), {
      recursive: true,
      force: true,
    }).catch(() => {});
  }

  // Delete all candidates (cascade handles related records)
  await prisma.candidate.deleteMany({ where: { id: { in: ids } } });

  console.log(`[AUDIT] Bulk deleted ${ids.length} candidates by ${token.email ?? token.sub ?? "unknown"}`);

  return NextResponse.json({ success: true, count: ids.length });
}
