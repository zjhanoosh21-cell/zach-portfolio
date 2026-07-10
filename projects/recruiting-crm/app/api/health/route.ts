import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const startTime = Date.now();

export async function GET() {
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: true,
      ts: new Date().toISOString(),
      uptime_sec: uptimeSec,
      memory_mb: Math.round(mem.rss / 1024 / 1024),
      node_env: process.env.NODE_ENV ?? "unknown",
    });
  } catch {
    return NextResponse.json({
      status: "error",
      db: false,
      ts: new Date().toISOString(),
      uptime_sec: uptimeSec,
    }, { status: 503 });
  }
}
