import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse } from "@/lib/csv";
import { checkPinBlocked, recordPinFailure, clearPinFailures } from "@/lib/pin-limiter";

const schema = z.object({ pin: z.string().regex(/^\d{4}$/) });

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isElevated = !!token.isAdmin || !!token.isManager;
  if (!isElevated) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const blocked = await checkPinBlocked(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.deletionPinHash) {
    return NextResponse.json({ error: "No admin PIN configured. Set one in Settings first." }, { status: 403 });
  }
  const pinMatch = await bcrypt.compare(parsed.data.pin, settings.deletionPinHash);
  if (!pinMatch) {
    await recordPinFailure(req);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  await clearPinFailures(req);

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
    },
  });

  const headers = [
    "Client ID",
    "Name",
    "Industry",
    "Specialty",
    "City",
    "State",
    "Website",
    "Active",
    "Notes",
    "Primary Contact Name",
    "Primary Contact Title",
    "Primary Contact Email",
    "Primary Contact Phone",
    "All Contacts",
    "Created At",
  ];

  const rows = clients.map((c) => {
    const primary = c.contacts.find((ct) => ct.isPrimary) ?? c.contacts[0];
    const allContacts = c.contacts
      .map((ct) => [ct.name, ct.title, ct.email, ct.phone].filter(Boolean).join(", "))
      .join("; ");

    return [
      c.id,
      c.name,
      c.industry,
      c.specialty,
      c.city,
      c.state,
      c.website,
      c.isActive ? "Yes" : "No",
      c.notes,
      primary?.name,
      primary?.title,
      primary?.email,
      primary?.phone,
      allContacts,
      c.createdAt.toISOString(),
    ];
  });

  const date = new Date().toISOString().slice(0, 10);
  console.log(`[AUDIT] Clients CSV exported by ${token.email}`);
  return csvResponse(buildCsv(headers, rows), `clients-${date}.csv`);
}
