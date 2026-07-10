"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "./modal";
import { inputClass, buttonPrimary, buttonGhost, buttonDanger } from "./ui";
import { saveAccount, deleteAccount, saveHolding, deleteHolding } from "@/app/actions";
import { ACCOUNT_TYPES, accountTypeLabel, fmtCurrency } from "@/lib/format";

type Holding = {
  id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  price: number;
  assetClass: string | null;
};

export type AccountData = {
  id: string;
  name: string;
  institution: string | null;
  type: string;
  category: string;
  balance: number;
  interestRate: number | null;
  holdings: Holding[];
};

const field = "space-y-1";
const labelClass = "text-xs font-medium text-ink-2";

function AccountForm({
  account,
  onDone,
}: {
  account?: AccountData;
  onDone: () => void;
}) {
  return (
    <form
      action={async (form) => {
        await saveAccount(form);
        onDone();
      }}
      className="space-y-3"
    >
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className={field}>
        <label className={labelClass}>Name</label>
        <input
          name="name"
          required
          defaultValue={account?.name}
          placeholder="e.g. Chase Checking"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={labelClass}>Type</label>
          <select name="type" defaultValue={account?.type ?? "checking"} className={inputClass}>
            <optgroup label="Assets">
              {ACCOUNT_TYPES.filter((t) => t.category === "ASSET").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Debts">
              {ACCOUNT_TYPES.filter((t) => t.category === "LIABILITY").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className={field}>
          <label className={labelClass}>Balance ($)</label>
          <input
            name="balance"
            type="number"
            step="0.01"
            required
            defaultValue={account?.balance}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={labelClass}>Institution (optional)</label>
          <input
            name="institution"
            defaultValue={account?.institution ?? ""}
            placeholder="e.g. Fidelity"
            className={inputClass}
          />
        </div>
        <div className={field}>
          <label className={labelClass}>Interest rate % (optional)</label>
          <input
            name="interestRate"
            type="number"
            step="0.01"
            defaultValue={account?.interestRate ?? ""}
            placeholder="APR / APY"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={buttonGhost}>
          Cancel
        </button>
        <button type="submit" className={buttonPrimary + " btn-accent-text"}>
          {account ? "Save changes" : "Add account"}
        </button>
      </div>
    </form>
  );
}

export function AddAccountButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonPrimary + " btn-accent-text"}>
        <Plus size={15} /> Add account
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add account">
        <AccountForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function HoldingForm({
  accountId,
  holding,
  onDone,
}: {
  accountId: string;
  holding?: Holding;
  onDone: () => void;
}) {
  return (
    <form
      action={async (form) => {
        await saveHolding(form);
        onDone();
      }}
      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
    >
      <input type="hidden" name="accountId" value={accountId} />
      {holding && <input type="hidden" name="id" value={holding.id} />}
      <div>
        <label className={labelClass}>Symbol</label>
        <input name="symbol" required defaultValue={holding?.symbol} placeholder="VTI" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Shares</label>
        <input name="quantity" type="number" step="any" required defaultValue={holding?.quantity} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Price ($)</label>
        <input name="price" type="number" step="any" required defaultValue={holding?.price} className={inputClass} />
      </div>
      <button type="submit" className={buttonGhost}>
        {holding ? "Save" : "Add"}
      </button>
    </form>
  );
}

export function AccountRow({ account }: { account: AccountData }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const investable = ["brokerage", "retirement", "hsa", "crypto"].includes(account.type);
  const holdingsValue = account.holdings.reduce((s, h) => s + h.quantity * h.price, 0);

  return (
    <div className="border-t border-line first:border-t-0">
      <div className="flex items-center gap-3 px-5 py-3">
        {investable ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-ink-3 hover:text-ink cursor-pointer"
            title="Holdings"
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        ) : (
          <span className="w-[15px]" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{account.name}</p>
          <p className="text-xs text-ink-3">
            {accountTypeLabel(account.type)}
            {account.institution ? ` · ${account.institution}` : ""}
            {account.interestRate != null ? ` · ${account.interestRate}%` : ""}
          </p>
        </div>
        <p className="text-sm font-semibold text-ink tabular">{fmtCurrency(account.balance)}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-ink-3 hover:text-ink cursor-pointer"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <form
            action={deleteAccount}
            onSubmit={(e) => {
              if (!confirm(`Delete "${account.name}"? This can't be undone.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={account.id} />
            <button className="p-1.5 text-ink-3 hover:text-critical cursor-pointer" title="Delete">
              <Trash2 size={13} />
            </button>
          </form>
        </div>
      </div>
      {expanded && investable && (
        <div className="mx-5 mb-3 ml-12 rounded-lg bg-surface-2 px-4 py-3 space-y-2">
          {account.holdings.length > 0 && (
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="text-left text-ink-3">
                  <th className="font-medium pb-1">Symbol</th>
                  <th className="font-medium pb-1 text-right">Shares</th>
                  <th className="font-medium pb-1 text-right">Price</th>
                  <th className="font-medium pb-1 text-right">Value</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {account.holdings.map((h) => (
                  <tr key={h.id} className="border-t border-line">
                    <td className="py-1.5 font-medium text-ink">{h.symbol}</td>
                    <td className="py-1.5 text-right tabular text-ink-2">{h.quantity}</td>
                    <td className="py-1.5 text-right tabular text-ink-2">{fmtCurrency(h.price, { cents: true })}</td>
                    <td className="py-1.5 text-right tabular text-ink">{fmtCurrency(h.quantity * h.price)}</td>
                    <td className="py-1.5 text-right">
                      <form action={deleteHolding} className="inline">
                        <input type="hidden" name="id" value={h.id} />
                        <button className={buttonDanger} title="Remove holding">
                          <Trash2 size={11} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {holdingsValue > 0 && Math.abs(holdingsValue - account.balance) > 1 && (
                  <tr>
                    <td colSpan={5} className="pt-1.5 text-[11px] text-ink-3">
                      Holdings total {fmtCurrency(holdingsValue)} differs from the account balance —
                      update the balance or prices to reconcile.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          <HoldingForm accountId={account.id} onDone={() => {}} />
        </div>
      )}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit account">
        <AccountForm account={account} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
