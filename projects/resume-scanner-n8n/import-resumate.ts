#!/usr/bin/env npx tsx
/**
 * scripts/import-resumate.ts
 *
 * Imports candidates from a RESUMate (Resum8) CSV export into the CRI CRM.
 * The CSV has no header row, uses Latin-1 encoding, and has 42 fixed columns.
 *
 * Usage:
 *   npx tsx scripts/import-resumate.ts [path/to/Export.csv] [options]
 *
 * Options:
 *   --commit              Actually write to the DB (default: dry run only)
 *   --from-year=YYYY      Only import records with entry date >= YYYY (default: 2020)
 *   --all-years           Import all years regardless of entry date
 *   --include-dnc         Also import DNC-flagged candidates (default: skip)
 *   --skip-no-contact     Skip records with no email AND no phone
 *
 * Examples:
 *   npx tsx scripts/import-resumate.ts                            # dry run, 2020+
 *   npx tsx scripts/import-resumate.ts --commit                   # import 2020+ records
 *   npx tsx scripts/import-resumate.ts --commit --all-years       # import everything
 *   npx tsx scripts/import-resumate.ts /path/to/Export.csv --commit --from-year=2022
 */

import fs from "fs";
import readline from "readline";
import { prisma } from "../lib/prisma";

// ── Column indices (0-based) ──────────────────────────────────────────────────
//
// RESUMate standard export columns:
//  0  Candidate ID
//  1  First Name
//  2  Last Name  (most records; some have middle name here by mistake)
//  3  Middle Initial / Name  (some records have last name here if col 2 is empty)
//  4  Country (always "USA" — skipped)
//  5  Address Line 1
//  6  Address Line 2
//  7  Unknown (skipped)
//  8  City
//  9  State
// 10  Zip
// 11  Recruiter Notes / Status (free-form, includes DNC flags and ratings)
// 12  Current Title / Applied Role (sometimes multi-role, sometimes just one)
// 13  Specialty / Practice Area (often employer name instead — messy)
// 14  Desired Salary (text: "55K", "$75K", "65K+", "$26/hr")
// 15  Typing WPM or vaccination notes ("70-75 wpm", "Yes Vaccinated", etc.)
// 16  Source (ZipRecruiter, LinkedIn, recruiter first names, empty)
// 17  Original Entry Date (M/D/YYYY)
// 18  Unknown (skipped)
// 19  Unknown (skipped)
// 20  Last Updated Date (not used by CRM — skipped)
// 21-31  Current employer block (mostly empty; used for company/address info)
// 32  Phone - Home
// 33  Phone - Cell
// 34  Email (most reliable contact field)
// 35  Unknown
// 36  Phone - Work
// 37  Unknown
// 38  Phone - Alt
// 39  Unknown
// 40  Phone - Mobile
// 41  Unknown

const C = {
  ID: 0,
  FIRST: 1,
  COL3: 2,
  COL4: 3,
  ADDRESS1: 5,
  CITY: 8,
  STATE: 9,
  ZIP: 10,
  NOTES: 11,
  TITLE: 12,
  SPECIALTY: 13,
  SALARY: 14,
  COL16: 15,
  SOURCE: 16,
  ENTRY_DATE: 17,
  PHONE_A: 32,
  PHONE_B: 33,
  EMAIL: 34,
  PHONE_C: 36,
  PHONE_D: 38,
  PHONE_E: 40,
} as const;

// ── Known legal practice keywords (used to detect if col 13 = practice areas vs employer name) ──
const LEGAL_PA_KEYWORDS = [
  "litigation", "patent", "copyright", "trademark", "corporate", "family law",
  "immigration", "criminal", "real estate", "bankruptcy", "intellectual property",
  "transactional", "probate", "employment", "insurance", "personal injury",
  "commercial", "contract", "civil", "appellate", "tax", "estate", "trust",
  "workers comp", "medical malpractice", "pi ", "lit ", "insur",
];

// ── CSV parser (handles quoted fields, no external deps) ─────────────────────
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i === line.length) {
      // trailing comma added empty field
      break;
    }
    if (line[i] === '"') {
      // Quoted field
      let field = "";
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += line[i++];
        }
      }
      result.push(field);
      if (line[i] === ",") i++;
    } else if (line[i] === ",") {
      result.push("");
      i++;
    } else {
      let field = "";
      while (i < line.length && line[i] !== ",") field += line[i++];
      result.push(field);
      if (line[i] === ",") i++;
    }
  }
  return result;
}

async function readCSV(path: string): Promise<string[][]> {
  const rows: string[][] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(path, { encoding: "latin1" as BufferEncoding }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) rows.push(parseCSVRow(trimmed));
  }
  return rows;
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function cell(row: string[], idx: number): string {
  return (row[idx] ?? "").trim();
}

function parseName(row: string[]): {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
} {
  const first = cell(row, C.FIRST);
  let last = cell(row, C.COL3);
  const col4 = cell(row, C.COL4);

  // Most records: col3 = last name, col4 = middle initial.
  // Some records: col3 is empty, col4 has the last name (data entry error in RESUMate).
  if (!last && col4) {
    last = col4;
  }

  const displayName = [first, last].filter(Boolean).join(" ") || null;
  return { firstName: first || null, lastName: last || null, displayName };
}

function parsePhone(row: string[]): string | null {
  const phoneCols = [C.PHONE_A, C.PHONE_B, C.PHONE_C, C.PHONE_D, C.PHONE_E];
  const SKIP = new Set(["n/a", "na", "-", "not available", "none", ""]);

  for (const idx of phoneCols) {
    const raw = cell(row, idx);
    if (!raw) continue;
    if (SKIP.has(raw.toLowerCase())) continue;

    // Some fields have "| E-mail: ..." appended — strip it
    const cleaned = raw.split(/\s*\|\s*/)[0].trim();

    // Must have at least 7 digits to be a real phone number
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length >= 7) return cleaned;
  }
  return null;
}

function parseSalary(raw: string): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toUpperCase();
  const SKIP = new Set(["?", "N/A", "NOT REQUIRED", "TBD", "OPEN", "NEGOTIABLE", "NA"]);
  if (SKIP.has(s)) return null;

  // "55K", "65K+", "$75K", "150K"
  const kMatch = s.match(/([\d,.]+)\s*K/);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(/,/g, ""));
    return isNaN(n) ? null : Math.min(Math.round(n * 1000), 9_999_999);
  }

  // "$41,000", "$26/hr" (hourly — skip), plain numbers
  if (/\/HR/.test(s)) return null; // hourly rates not comparable
  const numMatch = s.match(/\$?([\d,]+)/);
  if (numMatch) {
    const n = parseFloat(numMatch[1].replace(/,/g, ""));
    if (isNaN(n) || n <= 0) return null;
    if (n > 9_999_999) return null;
    // Numbers under 500 are almost certainly thousands ("45" = $45K)
    if (n < 500) return Math.round(n * 1000);
    return Math.round(n);
  }

  return null;
}

function parseWpm(raw: string): number | null {
  if (!raw?.trim()) return null;
  // "70 - 75 wpm", "82 wpm", "65-70 wpm"
  const rangeMatch = raw.match(/(\d+)\s*[-–]\s*(\d+)\s*wpm/i);
  if (rangeMatch) return parseInt(rangeMatch[1]); // lower end of range

  const singleMatch = raw.match(/(\d+)\s*wpm/i);
  if (singleMatch) return parseInt(singleMatch[1]);

  // Bare number only if it looks like WPM (20–200) and nothing else is in the string
  const bareMatch = raw.trim().match(/^(\d{2,3})$/);
  if (bareMatch) {
    const n = parseInt(bareMatch[1]);
    if (n >= 20 && n <= 200) return n;
  }

  return null;
}

function parseDate(raw: string): Date | null {
  if (!raw?.trim()) return null;
  const parts = raw.trim().split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (!m || !d || !y || y < 1950 || y > 2030) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return isNaN(dt.getTime()) ? null : dt;
}

function normalizeSource(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "RESUMate";
  if (s.includes("zip") || s.includes("ziprecruiter")) return "ZipRecruiter";
  if (s.includes("linkedin")) return "LinkedIn";
  if (s.includes("indeed")) return "Indeed";
  if (s.includes("monster")) return "Monster";
  if (s.includes("careerbuilder") || s.includes("cb database") || s.includes("cb "))
    return "CareerBuilder";
  if (s.includes("dice")) return "Dice";
  if (s.includes("glassdoor")) return "Glassdoor";
  if (s.includes("referral")) return "Referral";

  // CRI recruiter first names used as source = internal referral
  const recruiterFirstNames = [
    "becky", "neil", "holly", "nancy", "lesley", "sheila",
    "marty", "sandy", "hafsa", "irene", "carol", "paul", "donna",
  ];
  if (recruiterFirstNames.some((n) => s === n || s.startsWith(n + " "))) return "Referral";

  return raw.trim() || "RESUMate";
}

function inferStatus(notes: string): "DO_NOT_SUBMIT" | "REVIEWED" {
  if (!notes?.trim()) return "REVIEWED";
  const lower = notes.toLowerCase().trim();

  if (
    lower === "pass" ||
    /^pass[^a-z]/.test(lower) ||         // "pass!", "pass.", "pass-"
    lower.includes("do not consider") ||
    lower.includes("do not submit") ||
    /\bdnc\b/.test(lower) ||
    lower.includes("-pass!")             // "see notes-pass!"
  ) {
    return "DO_NOT_SUBMIT";
  }
  return "REVIEWED";
}

function buildWorkHistorySummary(notes: string, specialty: string, originalSource: string): string | null {
  const parts: string[] = [];

  // Recruiter notes (skip if it's just a DNC flag — those become status, not notes)
  if (notes && !["pass", "do not consider", "do not submit"].some((k) => notes.toLowerCase().includes(k))) {
    parts.push(notes);
  }

  // Specialty column — employer name or practice area (keep as context)
  if (specialty) parts.push(specialty);

  // Original source if it's a real channel name (not empty or recruiter name)
  const normalized = normalizeSource(originalSource);
  if (originalSource && normalized !== "RESUMate" && normalized !== "Referral") {
    parts.push(`Originally from: ${normalized}`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
}

function extractPracticeAreas(specialty: string): string[] {
  if (!specialty) return [];
  const lower = specialty.toLowerCase();
  const isPA = LEGAL_PA_KEYWORDS.some((k) => lower.includes(k));
  if (!isPA) return []; // likely an employer name, not practice areas
  return specialty
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 100);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  const csvPath =
    args.find((a) => !a.startsWith("--")) ??
    "/Users/zach_hanoosh/Downloads/CRI AI Automation/Export.csv";

  const commit = args.includes("--commit");
  const allYears = args.includes("--all-years");
  const includeDnc = args.includes("--include-dnc");
  const skipNoContact = args.includes("--skip-no-contact");
  const fromYearArg = args.find((a) => a.startsWith("--from-year="));
  const fromYear = allYears ? 0 : fromYearArg ? parseInt(fromYearArg.split("=")[1]) : 2020;

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  console.log("\n" + "━".repeat(52));
  console.log(commit ? "  RESUMate Import  ✦  LIVE RUN" : "  RESUMate Import  ✦  DRY RUN");
  console.log("━".repeat(52));
  console.log(`  CSV:          ${csvPath}`);
  console.log(`  Year filter:  ${allYears ? "all years" : `${fromYear}+`}`);
  console.log(`  Include DNC:  ${includeDnc}`);
  console.log(`  Skip no-contact: ${skipNoContact}`);
  if (!commit) console.log("\n  Pass --commit to actually write to the database.");
  console.log();

  const rows = await readCSV(csvPath);
  console.log(`  Parsed ${rows.length.toLocaleString()} rows from CSV\n`);

  let skipped_no_name = 0;
  let skipped_year = 0;
  let skipped_dnc = 0;
  let skipped_no_contact = 0;
  let skipped_duplicate = 0;
  let imported = 0;
  let errors = 0;
  const errorSamples: string[] = [];

  for (const row of rows) {
    if (row.length < 35) continue; // malformed row

    const resumateId = cell(row, C.ID);
    const { firstName, lastName, displayName } = parseName(row);

    if (!firstName) { skipped_no_name++; continue; }

    const entryDate = parseDate(cell(row, C.ENTRY_DATE));
    if (!allYears && fromYear > 0) {
      if (!entryDate || entryDate.getFullYear() < fromYear) { skipped_year++; continue; }
    }

    const notes = cell(row, C.NOTES);
    const status = inferStatus(notes);
    if (status === "DO_NOT_SUBMIT" && !includeDnc) { skipped_dnc++; continue; }

    const email = cell(row, C.EMAIL) || null;
    const phone = parsePhone(row);
    if (skipNoContact && !email && !phone) { skipped_no_contact++; continue; }

    const city = cell(row, C.CITY);
    const state = cell(row, C.STATE);
    const specialty = cell(row, C.SPECIALTY);
    const rawSource = cell(row, C.SOURCE);

    const candidateData = {
      resumateId: resumateId || null,
      firstName,
      lastName,
      displayName,
      resumeEmail: email,
      resumePhone: phone,
      candidateAddress: cell(row, C.ADDRESS1) || null,
      candidateCity: city || null,
      candidateState: state || null,
      candidateZip: cell(row, C.ZIP) || null,
      candidateLocation: [city, state].filter(Boolean).join(", ") || null,
      currentTitle: cell(row, C.TITLE) || null,
      desiredSalary: parseSalary(cell(row, C.SALARY)),
      typingWpm: parseWpm(cell(row, C.COL16)),
      workHistorySummary: buildWorkHistorySummary(notes, specialty, rawSource),
      practiceAreas: extractPracticeAreas(specialty),
      source: "RESUMate",
      status,
      originalEntryDate: entryDate,
    };

    if (!commit) {
      imported++;
      continue;
    }

    try {
      // Skip if this RESUMate ID already exists (safe re-import)
      if (resumateId) {
        const existing = await prisma.candidate.findUnique({
          where: { resumateId },
          select: { id: true },
        });
        if (existing) { skipped_duplicate++; continue; }
      }

      await prisma.candidate.create({ data: candidateData });
      imported++;
    } catch (e: unknown) {
      errors++;
      if (errorSamples.length < 5) {
        errorSamples.push(`  resumateId=${resumateId} name="${displayName}": ${String(e)}`);
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("━".repeat(52));
  console.log(commit ? "  Results  (COMMITTED)" : "  Results  (DRY RUN — no changes made)");
  console.log("━".repeat(52));
  console.log(`  Will import:          ${imported.toLocaleString()}`);
  if (commit) console.log(`  Already existed:      ${skipped_duplicate.toLocaleString()}`);
  console.log(`  Skipped — no name:    ${skipped_no_name}`);
  if (!allYears) console.log(`  Skipped — before ${fromYear}: ${skipped_year.toLocaleString()}`);
  if (!includeDnc) console.log(`  Skipped — DNC:        ${skipped_dnc.toLocaleString()}`);
  if (skipNoContact) console.log(`  Skipped — no contact: ${skipped_no_contact.toLocaleString()}`);
  if (errors) {
    console.log(`  Errors:               ${errors}`);
    errorSamples.forEach((s) => console.log(s));
  }
  console.log("━".repeat(52) + "\n");

  if (!commit) {
    console.log("  Dry run complete. Run with --commit to import.\n");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
