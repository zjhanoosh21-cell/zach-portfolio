import { getFinancialSnapshot } from "@/lib/finance";

export async function GET() {
  const snap = await getFinancialSnapshot();
  return new Response(JSON.stringify(snap, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sage-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
