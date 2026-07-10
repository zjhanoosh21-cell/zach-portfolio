import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// All candidate profile field keys that can be toggled visible/hidden
export const ALL_PROFILE_FIELDS = [
  "resumeEmail",
  "resumePhone",
  "linkedinUrl",
  "candidateLocation",
  "currentEmployer",
  "currentTitle",
  "appliedRole",
  "yearsOfExperience",
  "educationDegree",
  "educationInstitution",
  "certifications",
  "barAdmissions",
  "languages",
  "typingWpm",
  "desiredSalary",
  "availabilityNotes",
  "workHistorySummary",
] as const;

export type ProfileFieldKey = typeof ALL_PROFILE_FIELDS[number];

const schema = z.object({
  visible: z.array(z.string()),
});

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: token.sub },
    select: { profileFieldPrefs: true },
  });

  // If no prefs saved, return all fields as visible (default)
  const prefs = user?.profileFieldPrefs as { visible: string[] } | null;
  return NextResponse.json({
    visible: prefs?.visible ?? [...ALL_PROFILE_FIELDS],
  });
}

export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: token.sub },
    data: { profileFieldPrefs: parsed.data },
  });

  return NextResponse.json({ success: true });
}
