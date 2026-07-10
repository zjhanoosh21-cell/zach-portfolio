import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ role: z.enum(["basic", "manager", "admin"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isRequesterAdmin = !!token.isAdmin;
  const isRequesterManager = !!token.isManager;

  if (!isRequesterAdmin && !isRequesterManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { role } = parsed.data;

  // Managers cannot assign or touch System Admin accounts
  if (!isRequesterAdmin) {
    if (role === "admin") {
      return NextResponse.json({ error: "Only a System Admin can assign the System Admin role." }, { status: 403 });
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { isAdmin: true } });
    if (target?.isAdmin) {
      return NextResponse.json({ error: "Only a System Admin can change another System Admin's role." }, { status: 403 });
    }
  }

  // Prevent removing the last active System Admin
  if (role !== "admin") {
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { isAdmin: true } });
    if (targetUser?.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true, isActive: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last System Admin. Assign another System Admin first." },
          { status: 400 }
        );
      }
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      isAdmin: role === "admin",
      isManager: role === "manager",
    },
    select: { id: true, name: true, email: true, isActive: true, isAdmin: true, isManager: true },
  });

  return NextResponse.json(user);
}
