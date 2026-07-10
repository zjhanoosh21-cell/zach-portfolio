import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  title: z.string().max(200).nullish(),
  email: z.string().email().max(200).nullish().or(z.literal("")),
  phone: z.string().max(50).nullish(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(1000).nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contactId } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { email, name, ...rest } = parsed.data;

  if (parsed.data.isPrimary) {
    await prisma.clientContact.updateMany({
      where: { clientId: id, isPrimary: true, NOT: { id: contactId } },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.clientContact.update({
    where: { id: contactId, clientId: id },
    data: { ...rest, ...(name !== undefined && { name }), email: email || null },
  });

  return NextResponse.json(contact);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, contactId } = await params;

  await prisma.clientContact.delete({ where: { id: contactId, clientId: id } });

  return NextResponse.json({ success: true });
}
