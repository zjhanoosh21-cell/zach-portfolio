import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(200).trim(),
  title: z.string().max(200).nullish(),
  email: z.string().email().max(200).nullish().or(z.literal("")),
  phone: z.string().max(50).nullish(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(1000).nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const clientExists = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!clientExists) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { email, ...rest } = parsed.data;

  // If marking as primary, unset any existing primary contact
  if (parsed.data.isPrimary) {
    await prisma.clientContact.updateMany({
      where: { clientId: id, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.clientContact.create({
    data: { ...rest, email: email || null, clientId: id },
  });

  return NextResponse.json(contact, { status: 201 });
}
