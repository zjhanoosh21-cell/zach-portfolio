import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ids: z.array(z.string()).optional(), // omit to mark all read
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = token.id as string;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const now = new Date();
  if (parsed.data.ids && parsed.data.ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: parsed.data.ids }, userId, readAt: null },
      data: { readAt: now },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now },
    });
  }

  return NextResponse.json({ success: true });
}
