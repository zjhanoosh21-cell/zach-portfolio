/**
 * Seed script — creates initial admin user and n8n API key.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts \
 *     --email your@email.com --name "Your Name" --password "yourpassword"
 *
 * Or set defaults below and run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const DEFAULT_EMAIL = process.env.SEED_EMAIL || "zachary@corporaterecruitersinc.com";
const DEFAULT_NAME = process.env.SEED_NAME || "Zachary";
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "ChangeMe123!";

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const email = get("--email") || DEFAULT_EMAIL;
  const name = get("--name") || DEFAULT_NAME;
  const password = get("--password") || DEFAULT_PASSWORD;

  // Create or update user
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, isActive: true, isAdmin: true },
    create: { email, name, passwordHash, isActive: true, isAdmin: true },
  });

  console.log(`✓ User created/updated: ${user.email}`);

  // Generate an API key for n8n
  const rawKey = `crm_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = rawKey.slice(0, 8);
  const keyHash = await bcrypt.hash(rawKey, 10);

  await prisma.apiKey.create({
    data: {
      name: "n8n Production",
      keyHash,
      prefix,
      isActive: true,
    },
  });

  console.log(`\n✓ API key created for n8n`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`IMPORTANT — save this key now, it won't be shown again:`);
  console.log(`\n  ${rawKey}\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\nAdd this to your n8n HTTP Request node as:`);
  console.log(`  Header: X-API-Key`);
  console.log(`  Value:  ${rawKey}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
