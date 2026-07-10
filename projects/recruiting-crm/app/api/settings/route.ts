import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const pinSchema = z.object({
  action: z.literal("set_deletion_pin"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  currentPin: z.string().optional(), // required if a PIN is already set
});

const passwordSchema = z.object({
  action: z.literal("change_password"),
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

const generalSchema = z.object({
  action: z.literal("update_general"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  companyName: z.string().min(1).max(100).optional(),
  intakeEnabled: z.boolean().optional(),
  aiScoringEnabled: z.boolean().optional(),
});

const schema = z.discriminatedUnion("action", [pinSchema, passwordSchema, generalSchema]);

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({
    hasDeletionPin: !!settings?.deletionPinHash,
    companyName: settings?.companyName ?? "Corporate Recruiters Inc.",
    intakeEnabled: settings?.intakeEnabled ?? true,
    aiScoringEnabled: settings?.aiScoringEnabled ?? true,
  });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (parsed.data.action === "set_deletion_pin") {
    if (!token.isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { pin, currentPin } = parsed.data;

    // If a PIN already exists, require the current one first
    const existing = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (existing?.deletionPinHash && currentPin) {
      const match = await bcrypt.compare(currentPin, existing.deletionPinHash);
      if (!match) return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 403 });
    } else if (existing?.deletionPinHash && !currentPin) {
      return NextResponse.json({ error: "Current PIN is required to change it" }, { status: 400 });
    }

    const hash = await bcrypt.hash(pin, 12);
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", deletionPinHash: hash },
      update: { deletionPinHash: hash },
    });

    return NextResponse.json({ success: true, message: "Deletion PIN updated" });
  }

  if (parsed.data.action === "change_password") {
    const { currentPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: token.id as string } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

    return NextResponse.json({ success: true, message: "Password updated" });
  }

  if (parsed.data.action === "update_general") {
    if (!token.isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const { action: _a, pin, ...data } = parsed.data;

    // Verify deletion PIN
    const existing = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (!existing?.deletionPinHash) {
      return NextResponse.json({ error: "Set a Deletion PIN first before changing these settings." }, { status: 400 });
    }
    const pinMatch = await bcrypt.compare(pin, existing.deletionPinHash);
    if (!pinMatch) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
    }

    try {
      await prisma.appSettings.update({
        where: { id: "singleton" },
        data: {
          companyName: data.companyName,
          intakeEnabled: data.intakeEnabled,
          aiScoringEnabled: data.aiScoringEnabled,
        },
      });
    } catch (err) {
      console.error("[settings] AppSettings update failed:", err);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }
}
