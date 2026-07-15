/**
 * Demo seed — entirely fictional finances for the hosted preview.
 * Run with: npx tsx scripts/seed-demo.ts
 * (Point DATABASE_URL at the target database first.)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  console.log("Clearing existing data…");
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.advisorNote.deleteMany({});
  await prisma.holding.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.incomeSource.deleteMany({});
  await prisma.budgetCategory.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.snapshot.deleteMany({});
  await prisma.profile.deleteMany({});

  await prisma.profile.create({
    data: {
      id: "main",
      name: "Demo User",
      birthYear: 1991,
      maritalStatus: "single",
      dependents: 0,
      state: "MI",
      employmentStatus: "employed",
      riskTolerance: "moderate",
      retirementAge: 62,
      notes: "Fictional profile for the hosted preview.",
    },
  });

  // ── Accounts ──
  const brokerage = await prisma.account.create({
    data: { name: "Brokerage", institution: "Fidelity", type: "brokerage", category: "ASSET", balance: 14350 },
  });
  const retirement = await prisma.account.create({
    data: { name: "401(k)", institution: "Vanguard", type: "retirement", category: "ASSET", balance: 68200 },
  });
  await prisma.account.createMany({
    data: [
      { name: "Checking", institution: "Chase", type: "checking", category: "ASSET", balance: 4820 },
      { name: "High-Yield Savings", institution: "Ally", type: "savings", category: "ASSET", balance: 16500, interestRate: 4.1 },
      { name: "Credit Card", institution: "Chase", type: "credit_card", category: "LIABILITY", balance: 1240, interestRate: 22.9 },
      { name: "Auto Loan", institution: "Credit Union", type: "auto_loan", category: "LIABILITY", balance: 9800, interestRate: 6.4 },
    ],
  });

  await prisma.holding.createMany({
    data: [
      { accountId: retirement.id, symbol: "VTI", name: "Total US Stock Market", quantity: 180, price: 265, assetClass: "us_stock" },
      { accountId: retirement.id, symbol: "VXUS", name: "Total International", quantity: 220, price: 62, assetClass: "intl_stock" },
      { accountId: retirement.id, symbol: "BND", name: "Total Bond Market", quantity: 90, price: 73, assetClass: "bond" },
      { accountId: brokerage.id, symbol: "VOO", name: "S&P 500 ETF", quantity: 22, price: 520, assetClass: "us_stock" },
      { accountId: brokerage.id, symbol: "AAPL", name: "Apple Inc.", quantity: 12, price: 235, assetClass: "us_stock" },
    ],
  });

  await prisma.incomeSource.create({
    data: { name: "Salary", amount: 6400, frequency: "monthly", type: "salary" },
  });

  await prisma.budgetCategory.createMany({
    data: [
      { name: "Rent", plannedAmount: 1450, group: "needs" },
      { name: "Groceries", plannedAmount: 450, group: "needs" },
      { name: "Utilities & Internet", plannedAmount: 210, group: "needs" },
      { name: "Car (gas + insurance)", plannedAmount: 340, group: "needs" },
      { name: "Dining out", plannedAmount: 280, group: "wants" },
      { name: "Subscriptions", plannedAmount: 65, group: "wants" },
      { name: "Travel fund", plannedAmount: 200, group: "savings" },
      { name: "Investing", plannedAmount: 900, group: "savings" },
    ],
  });

  await prisma.goal.createMany({
    data: [
      { name: "Emergency fund — 6 months", description: "Target is 6 months of core expenses (~$17k).", targetAmount: 17000, currentAmount: 16500, priority: 1, status: "active" },
      { name: "Pay off credit card", description: "Kill the 22.9% APR balance before anything else.", targetAmount: 1240, currentAmount: 0, priority: 1, status: "active", createdBy: "advisor" },
      { name: "House down payment", description: "20% on a ~$300k place.", targetAmount: 60000, currentAmount: 21500, targetDate: new Date("2028-06-01"), priority: 2, status: "active" },
    ],
  });

  // ── Net-worth history for the dashboard chart ──
  const history = [
    { m: 8, assets: 91800, liabilities: 13900 },
    { m: 7, assets: 93400, liabilities: 13350 },
    { m: 6, assets: 95100, liabilities: 12800 },
    { m: 5, assets: 96200, liabilities: 12550 },
    { m: 4, assets: 98750, liabilities: 12100 },
    { m: 3, assets: 100300, liabilities: 11700 },
    { m: 2, assets: 101900, liabilities: 11400 },
    { m: 1, assets: 103100, liabilities: 11150 },
    { m: 0, assets: 103870, liabilities: 11040 },
  ];
  for (const h of history) {
    await prisma.snapshot.create({
      data: {
        date: ymd(daysAgo(h.m * 30)),
        assets: h.assets,
        liabilities: h.liabilities,
        netWorth: h.assets - h.liabilities,
      },
    });
  }

  // ── A saved conversation so visitors see what an advisor session looks like ──
  const convo = await prisma.conversation.create({
    data: { title: "Should I pay off my credit card or invest more?" },
  });
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: "user",
      content: "I have about $1,200 sitting on my credit card and I'm putting $900/month into index funds. Should I pause investing and clear the card first?",
    },
  });
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      role: "assistant",
      content:
        "Short answer: yes — clear the card first, and it isn't close.\n\nYour card is charging 22.9% APR. No investment reliably returns anything near that, so every month the balance rides, you're effectively borrowing at 23% to invest at maybe 7–10%. Here's what I'd do:\n\n1. **This month:** redirect the $900 investing contribution plus ~$350 of your travel-fund budget to the card — that clears the $1,240 balance in one cycle.\n2. **Next month:** resume the $900 into index funds as normal.\n3. **Going forward:** treat the card as a charge card — pay the statement balance in full every month.\n\nYour emergency fund is at $16.5k of a $17k target, so you have the cushion to do this without touching it. I've added \"Pay off credit card\" as a top-priority goal so we can track it, and made a note to check in on it next session.\n\nOne trade-off to be aware of: your travel fund takes a one-month pause. Given the card is costing you ~$24/month in interest, that's a good trade.",
      toolSummary: JSON.stringify([
        { tool: "create_goal", summary: 'Created goal "Pay off credit card" — $1,240, priority 1' },
        { tool: "add_advisor_note", summary: "Follow up next session: confirm card balance is $0 and investing resumed" },
      ]),
    },
  });

  await prisma.advisorNote.create({
    data: {
      content: "Follow up: confirm the credit card is paid off and the $900/mo index investing resumed.",
      category: "follow_up",
    },
  });

  console.log("Seed complete — fictional demo finances loaded.");
  console.log("Net worth: $92,830 · 6 accounts · 8 budget categories · 3 goals · 1 saved advisor conversation");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
