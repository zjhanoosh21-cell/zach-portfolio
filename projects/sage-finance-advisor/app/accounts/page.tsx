import { Landmark } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fmtCurrency } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { AddAccountButton, AccountRow, type AccountData } from "@/components/account-ui";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = (await prisma.account.findMany({
    include: { holdings: true },
    orderBy: { balance: "desc" },
  })) as AccountData[];

  const assets = accounts.filter((a) => a.category === "ASSET");
  const liabilities = accounts.filter((a) => a.category === "LIABILITY");
  const assetTotal = assets.reduce((s, a) => s + a.balance, 0);
  const debtTotal = liabilities.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Accounts</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Everything you own and owe. Net worth: {fmtCurrency(assetTotal - debtTotal)}
          </p>
        </div>
        <AddAccountButton />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Landmark size={28} />}
            title="No accounts yet"
            body="Add your checking, savings, investments, and debts — or just tell Sage about them in a conversation and it'll add them for you."
            action={<AddAccountButton />}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Assets" subtitle={`${assets.length} account${assets.length === 1 ? "" : "s"} · ${fmtCurrency(assetTotal)}`} />
            <div className="pb-1">
              {assets.length === 0 ? (
                <p className="px-5 pb-4 text-sm text-ink-3">No asset accounts yet.</p>
              ) : (
                assets.map((a) => <AccountRow key={a.id} account={a} />)
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Debts" subtitle={`${liabilities.length} account${liabilities.length === 1 ? "" : "s"} · ${fmtCurrency(debtTotal)}`} />
            <div className="pb-1">
              {liabilities.length === 0 ? (
                <p className="px-5 pb-4 text-sm text-ink-3">No debts — nice.</p>
              ) : (
                liabilities.map((a) => <AccountRow key={a.id} account={a} />)
              )}
            </div>
          </Card>
          <p className="text-xs text-ink-3 px-1">
            Tip: expand investment accounts to track individual holdings. Balances you
            update here feed the net-worth trend on your dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
