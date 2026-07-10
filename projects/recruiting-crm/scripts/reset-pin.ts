#!/usr/bin/env npx tsx
/**
 * Deletion PIN reset script.
 * Clears the deletion PIN so that a System Admin can set a new one from
 * Settings > Security > Candidate Deletion PIN.
 *
 * Use this when the PIN has been forgotten and no admin can log in to reset it,
 * OR when the admin is logged in but the old PIN is unknown.
 *
 * Usage:
 *   npx tsx scripts/reset-pin.ts
 *
 * In production (Docker):
 *   docker exec cri-crm npx tsx scripts/reset-pin.ts
 *
 * After running: log in as a System Admin and set a new PIN in Settings > Security.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", deletionPinHash: null },
    update: { deletionPinHash: null },
  });

  console.log("✓ Deletion PIN cleared.");
  console.log("  Log in as a System Admin and set a new PIN in:");
  console.log("  Settings > Security > Candidate Deletion PIN");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
