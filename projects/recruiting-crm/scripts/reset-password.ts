#!/usr/bin/env npx tsx
/**
 * Admin password reset script.
 * Use this when a user (including the System Admin) cannot log in and cannot
 * reset their own password through the app.
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts <email> <new-password>
 *
 * In production (Docker):
 *   docker exec cri-crm npx tsx scripts/reset-password.ts admin@company.com NewPassword123!
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email> <new-password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Error: No user found with email "${email}".`);
    const all = await prisma.user.findMany({ select: { email: true, name: true } });
    if (all.length > 0) {
      console.error("Registered users:");
      all.forEach((u) => console.error(`  ${u.email}  (${u.name})`));
    }
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  console.log(`✓ Password reset for ${user.name} (${email}).`);
  console.log("  They can now log in with the new password.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
