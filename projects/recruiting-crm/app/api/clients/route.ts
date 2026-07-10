import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  industry: z.string().max(100).nullish(),
  specialty: z.string().max(200).nullish(),
  city: z.string().max(100).nullish(),
  state: z.string().max(50).nullish(),
  website: z.string().url().max(300).nullish().or(z.literal("")),
  notes: z.string().max(2000).nullish(),
});

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const clients = await prisma.client.findMany({
    where: {
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { industry: { contains: q, mode: "insensitive" } },
          { specialty: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { jobOrders: true } },
      contacts: {
        where: { isPrimary: true },
        take: 1,
        select: { name: true, email: true, phone: true },
      },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { website, ...rest } = parsed.data;
  const client = await prisma.client.create({
    data: {
      ...rest,
      website: website || null,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
