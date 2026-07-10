import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const IntakeSchema = z.object({
  name: z.string().min(1),
  businessName: z.string().optional(),
  industry: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  outreachTemplate: z.string().optional(),
  outreachSentAt: z.string().datetime().optional(),
  mockupBase64: z.string().optional(),
  mockupUrl: z.string().url().optional(),
});

async function validateApiKey(req: Request): Promise<boolean> {
  const key = req.headers.get("X-API-Key");
  if (!key) return false;
  const settings = await prisma.appSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings) return false;
  return bcrypt.compare(key, settings.apiKey);
}

export async function POST(req: Request) {
  const authorized = await validateApiKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mockupBase64, mockupUrl, outreachSentAt, ...prospectData } =
    parsed.data;

  // Dedup on email
  if (prospectData.email) {
    const existing = await prisma.prospect.findFirst({
      where: { email: prospectData.email },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, created: false });
    }
  }

  // Create the prospect first to get an ID for the mockup filename
  const prospect = await prisma.prospect.create({
    data: {
      ...prospectData,
      status: "email_sent",
      source: "scraped",
      outreachSentAt: outreachSentAt ? new Date(outreachSentAt) : new Date(),
      mockupUrl: mockupUrl ?? null,
    },
  });

  // Save base64 mockup image to disk
  let mockupPath: string | null = null;
  if (mockupBase64) {
    try {
      const match = mockupBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1].split("/")[1] ?? "png";
        const buffer = Buffer.from(match[2], "base64");
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "mockups");
        await mkdir(uploadsDir, { recursive: true });
        const filename = `${prospect.id}.${ext}`;
        await writeFile(path.join(uploadsDir, filename), buffer);
        mockupPath = `/uploads/mockups/${filename}`;
      }
    } catch {
      // Non-fatal: log but don't fail the request
      console.error("Failed to save mockup image");
    }
  }

  if (mockupPath) {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { mockupPath },
    });
  }

  return NextResponse.json({ id: prospect.id, created: true }, { status: 201 });
}
