export function fmtCurrency(n: number, opts: { cents?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);
}

export function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function fmtPercent(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const ACCOUNT_TYPES: {
  value: string;
  label: string;
  category: "ASSET" | "LIABILITY";
}[] = [
  { value: "checking", label: "Checking", category: "ASSET" },
  { value: "savings", label: "Savings", category: "ASSET" },
  { value: "brokerage", label: "Brokerage", category: "ASSET" },
  { value: "retirement", label: "Retirement (401k/IRA)", category: "ASSET" },
  { value: "hsa", label: "HSA", category: "ASSET" },
  { value: "crypto", label: "Crypto", category: "ASSET" },
  { value: "real_estate", label: "Real estate", category: "ASSET" },
  { value: "vehicle", label: "Vehicle", category: "ASSET" },
  { value: "other_asset", label: "Other asset", category: "ASSET" },
  { value: "credit_card", label: "Credit card", category: "LIABILITY" },
  { value: "student_loan", label: "Student loan", category: "LIABILITY" },
  { value: "auto_loan", label: "Auto loan", category: "LIABILITY" },
  { value: "mortgage", label: "Mortgage", category: "LIABILITY" },
  { value: "personal_loan", label: "Personal loan", category: "LIABILITY" },
  { value: "other_debt", label: "Other debt", category: "LIABILITY" },
];

export function accountTypeLabel(type: string) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  annual: 1 / 12,
};

export function monthlyAmount(amount: number, frequency: string) {
  return amount * (FREQUENCY_MULTIPLIERS[frequency] ?? 1);
}
