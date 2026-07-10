import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

/**
 * Validates the X-API-Key header against stored (hashed) API keys.
 * Returns true if a matching active key is found, false otherwise.
 * Also updates lastUsedAt on the matched key.
 */
export async function validateApiKey(req: NextRequest): Promise<boolean> {
  const key = req.headers.get("x-api-key");
  if (!key || !key.startsWith("crm_")) return false;

  // Use prefix (first 8 chars) to narrow the query before bcrypt comparison
  const prefix = key.slice(0, 8);

  const apiKeys = await prisma.apiKey.findMany({
    where: { prefix, isActive: true },
  });

  for (const apiKey of apiKeys) {
    const match = await bcrypt.compare(key, apiKey.keyHash);
    if (match) {
      // Update lastUsedAt in background (don't await — fire and forget)
      prisma.apiKey
        .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {}); // ignore errors here
      return true;
    }
  }

  return false;
}
