/**
 * Demo seed — clears all demo data and creates realistic test candidates
 * at every pipeline stage, including placed (with financials) and
 * Resum8-imported candidates.
 *
 * Preserves: users, API keys, AppSettings
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "DemoPass123!";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Clearing existing demo data…");

  // Delete in FK-safe order
  await prisma.note.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.candidateAttachment.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.clientContact.deleteMany({});
  await prisma.jobOrder.deleteMany({});
  await prisma.client.deleteMany({});

  console.log("✓ Cleared\n");

  // ── DEMO USER (also used for submittedById) ───────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      isActive: true,
      isAdmin: true,
    },
    create: {
      email: DEMO_EMAIL,
      name: "Demo Recruiter",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      isActive: true,
      isAdmin: true,
    },
  });
  console.log(`✓ Demo user ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);

  // ── CLIENTS ───────────────────────────────────────────────────────────────

  const [harrington, meridian, voss] = await Promise.all([
    prisma.client.create({
      data: {
        name: "Harrington & Cole LLP",
        industry: "Law Firm",
        specialty: "Litigation",
        city: "Chicago",
        state: "IL",
        website: "https://harringtoncole.example.com",
        isActive: true,
        notes: "Large downtown firm, 80+ attorneys. Primary contact is Jennifer Walsh.",
        contacts: {
          create: [
            { name: "Jennifer Walsh", title: "Director of Human Resources", email: "jwalsh@harringtoncole.example.com", phone: "(312) 555-0101", isPrimary: true },
            { name: "Mark Simmons", title: "Office Manager", email: "msimmons@harringtoncole.example.com", phone: "(312) 555-0102" },
          ],
        },
      },
    }),
    prisma.client.create({
      data: {
        name: "Meridian Financial Group",
        industry: "Financial Services",
        specialty: "Corporate Legal",
        city: "Chicago",
        state: "IL",
        isActive: true,
        notes: "In-house legal department. Prefers direct hire, salary range $55k–$75k.",
        contacts: {
          create: [
            { name: "Patricia Nguyen", title: "VP of Legal Operations", email: "pnguyen@meridian.example.com", phone: "(312) 555-0201", isPrimary: true },
          ],
        },
      },
    }),
    prisma.client.create({
      data: {
        name: "Voss & Stratton",
        industry: "Law Firm",
        specialty: "Corporate / M&A",
        city: "Naperville",
        state: "IL",
        isActive: true,
        notes: "Boutique corporate firm in suburban Chicago. Fast placement timelines.",
        contacts: {
          create: [
            { name: "Robert Voss Jr.", title: "Managing Partner", email: "rvoss@vossstratton.example.com", phone: "(630) 555-0301", isPrimary: true },
          ],
        },
      },
    }),
  ]);

  console.log("✓ Created 3 clients");

  // ── JOB ORDERS ────────────────────────────────────────────────────────────

  const [jobLitigationPara, jobLegalSecretary, jobBillingCoord, jobCorporatePara, jobLegalAssist] = await Promise.all([
    prisma.jobOrder.create({
      data: {
        title: "Litigation Paralegal",
        clientId: harrington.id,
        clientName: "Harrington & Cole LLP",
        location: "Chicago, IL",
        jobType: "DIRECT_HIRE",
        status: "OPEN",
        roleType: "PARALEGAL",
        practiceAreas: ["Litigation", "Civil Defense", "Insurance Defense"],
        requiredSkills: ["Case management", "E-filing", "iManage", "Deposition prep"],
        salaryMin: 55000,
        salaryMax: 70000,
        priority: 1,
        description: "Seeking an experienced litigation paralegal for a busy downtown Chicago firm. Will support 3–4 partners on active commercial litigation matters.",
        internalNotes: "Client wants someone placed within 3 weeks. Strong preference for downtown experience.",
        openedAt: daysAgo(14),
        targetFillDate: daysFromNow(21),
        assignedToId: admin.id,
      },
    }),
    prisma.jobOrder.create({
      data: {
        title: "Legal Secretary – Corporate",
        clientId: harrington.id,
        clientName: "Harrington & Cole LLP",
        location: "Chicago, IL",
        jobType: "DIRECT_HIRE",
        status: "OPEN",
        roleType: "LEGAL_SECRETARY",
        practiceAreas: ["Corporate", "Transactional"],
        requiredSkills: ["Word", "Outlook", "Calendar management", "Document formatting"],
        salaryMin: 45000,
        salaryMax: 58000,
        priority: 2,
        description: "Supporting two senior partners in the corporate practice group. Heavy calendar and document management.",
        openedAt: daysAgo(7),
        assignedToId: admin.id,
      },
    }),
    prisma.jobOrder.create({
      data: {
        title: "Billing Coordinator",
        clientId: meridian.id,
        clientName: "Meridian Financial Group",
        location: "Chicago, IL (Hybrid)",
        jobType: "DIRECT_HIRE",
        status: "FILLED",
        roleType: "BILLING_COORDINATOR",
        practiceAreas: ["Corporate Legal"],
        requiredSkills: ["Aderant", "E-billing", "Budget tracking", "Excel"],
        salaryMin: 50000,
        salaryMax: 65000,
        priority: 2,
        description: "In-house billing coordinator supporting 12-attorney legal department. Manage matter billing, outside counsel invoices, and accruals.",
        openedAt: daysAgo(60),
        assignedToId: admin.id,
      },
    }),
    prisma.jobOrder.create({
      data: {
        title: "Corporate Paralegal",
        clientId: voss.id,
        clientName: "Voss & Stratton",
        location: "Naperville, IL",
        jobType: "DIRECT_HIRE",
        status: "FILLED",
        roleType: "PARALEGAL",
        practiceAreas: ["Corporate", "M&A", "Securities"],
        requiredSkills: ["Entity formation", "Due diligence", "SEC filings", "Cap tables"],
        salaryMin: 60000,
        salaryMax: 78000,
        priority: 1,
        description: "Boutique M&A firm seeking corporate paralegal with transactional experience. Will be primary paralegal supporting two partners.",
        internalNotes: "Robert Voss called personally — wants a strong Tier 1 or 2 candidate only.",
        openedAt: daysAgo(45),
        assignedToId: admin.id,
      },
    }),
    prisma.jobOrder.create({
      data: {
        title: "Legal Assistant – Temp to Hire",
        clientId: harrington.id,
        clientName: "Harrington & Cole LLP",
        location: "Chicago, IL",
        jobType: "TEMP_TO_HIRE",
        status: "OPEN",
        roleType: "LEGAL_ASSISTANT",
        practiceAreas: ["General Litigation"],
        requiredSkills: ["Microsoft Office", "Filing", "Client intake"],
        salaryMin: 40000,
        salaryMax: 50000,
        priority: 3,
        description: "Temp-to-hire legal assistant covering a maternity leave with potential to go permanent.",
        openedAt: daysAgo(3),
        assignedToId: admin.id,
      },
    }),
  ]);

  console.log("✓ Created 5 job orders");

  // ── CANDIDATES ────────────────────────────────────────────────────────────
  // Status legend:
  //   NEW          — just arrived from ZipRecruiter, not yet reviewed
  //   REVIEWED     — recruiter has looked at them, no action yet
  //   ACTIVE       — in active pipeline (being submitted / interviewing)
  //   SUBMITTED    — currently submitted to at least one job
  //   INTERVIEWING — has scheduled/completed interview
  //   PLACED       — successfully placed
  //   ON_HOLD      — paused / waiting
  //   REJECTED     — not a fit
  //   DO_NOT_CONSIDER — hard exclude

  // ── NEW — arrived today from ZipRecruiter ─────────────────────────────────

  const jenKim = await prisma.candidate.create({
    data: {
      firstName: "Jennifer",
      lastName: "Kim",
      displayName: "Kim, Jennifer",
      resumeEmail: "jennifer.kim@email.com",
      resumePhone: "(312) 555-2001",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Goldberg & Associates LLP",
      currentTitle: "Litigation Paralegal",
      yearsOfExperience: 6,
      workHistorySummary: "6 years as a litigation paralegal at a mid-size Chicago defense firm. Handles complex commercial disputes, mass tort, and insurance defense matters. Experienced with trial prep and managing large document productions.",
      educationDegree: "Bachelor of Science",
      educationMajor: "Legal Studies",
      educationInstitution: "DePaul University",
      educationYear: 2018,
      certifications: ["NALA Paralegal Certificate", "Notary Public – Illinois"],
      languages: ["English", "Korean (conversational)"],
      availabilityNotes: "Available with 2 weeks notice",
      desiredSalary: 66000,
      source: "ZipRecruiter",
      appliedRole: "Litigation Paralegal",
      status: "NEW",
      aiCompositeScore: 91,
      aiTier: "TIER_1",
      aiTriageAction: "ADVANCE_PRIORITY_CALL",
      aiDetectedRoleType: "PARALEGAL",
      scoreLawFirmExp: 5,
      scoreLongevity: 5,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 4,
      scoreProfessionalism: 5,
      practiceAreas: ["Commercial Litigation", "Insurance Defense", "Mass Tort"],
      keySkills: ["Case management", "iManage", "E-filing", "Trial prep", "Document review"],
      topStrengths: ["Exact title and experience match", "Strong downtown Chicago law firm background", "Stable 6-year tenure"],
      topConcerns: [],
      riskFlags: [],
      aiSummary: "Top-tier litigation paralegal with 6 years at a directly comparable Chicago firm. Excellent match for the Harrington & Cole role — recommend immediate outreach.",
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
  });

  const marcusThompson = await prisma.candidate.create({
    data: {
      firstName: "Marcus",
      lastName: "Thompson",
      displayName: "Thompson, Marcus",
      resumeEmail: "marcus.t@gmail.com",
      resumePhone: "(773) 555-2002",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Allstate Insurance",
      currentTitle: "Office Support Specialist",
      yearsOfExperience: 1,
      workHistorySummary: "1 year in general office support at an insurance company. Handles mail, filing, and data entry. No legal-specific experience. Recently completed an online legal assistant certificate program.",
      educationDegree: "High School Diploma",
      educationMajor: null,
      educationInstitution: "Westinghouse College Prep",
      educationYear: 2022,
      certifications: ["Legal Assistant Certificate – Online"],
      languages: ["English"],
      availabilityNotes: "Available immediately",
      desiredSalary: 38000,
      source: "ZipRecruiter",
      appliedRole: "Legal Assistant – Temp to Hire",
      status: "NEW",
      aiCompositeScore: 32,
      aiTier: "TIER_4",
      aiTriageAction: "PASS_DO_NOT_SUBMIT",
      aiDetectedRoleType: "LEGAL_ASSISTANT",
      scoreLawFirmExp: 1,
      scoreLongevity: 2,
      scoreTitleSpecific: 1,
      scoreTechnicalSkills: 2,
      scoreProfessionalism: 3,
      practiceAreas: [],
      keySkills: ["Microsoft Office", "Filing", "Data entry"],
      topStrengths: ["Available immediately", "Low salary expectation"],
      topConcerns: ["No legal experience", "Only online certificate", "Very limited work history"],
      riskFlags: ["No prior law firm or legal department experience", "Online-only credential — unverified"],
      aiSummary: "Entry-level applicant with no substantive legal experience. Online certificate is insufficient for most law firm roles. Not recommended for current openings.",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  const priyaKapoor = await prisma.candidate.create({
    data: {
      firstName: "Priya",
      lastName: "Kapoor",
      displayName: "Kapoor, Priya",
      resumeEmail: "priya.kapoor@email.com",
      resumePhone: "(312) 555-2003",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Sears Holdings (Legal Dept.)",
      currentTitle: "Legal Assistant",
      yearsOfExperience: 6,
      workHistorySummary: "6 years as a legal assistant in the corporate legal department of a major retailer. Managed vendor contracts, handled IP filings, and supported general counsel on employment matters. Company restructuring prompted job search.",
      educationDegree: "Bachelor of Arts",
      educationMajor: "Business Law",
      educationInstitution: "Illinois State University",
      educationYear: 2017,
      certifications: [],
      languages: ["English", "Hindi", "Gujarati"],
      availabilityNotes: "Available in 3 weeks",
      desiredSalary: 55000,
      source: "ZipRecruiter",
      appliedRole: "Legal Secretary – Corporate",
      status: "NEW",
      aiCompositeScore: 71,
      aiTier: "TIER_2",
      aiTriageAction: "ADVANCE_SCHEDULE_REVIEW",
      aiDetectedRoleType: "LEGAL_ASSISTANT",
      scoreLawFirmExp: 2,
      scoreLongevity: 4,
      scoreTitleSpecific: 3,
      scoreTechnicalSkills: 4,
      scoreProfessionalism: 4,
      practiceAreas: ["Corporate", "Employment Law", "Intellectual Property"],
      keySkills: ["Contract management", "IP filings", "Microsoft Office", "Concur", "DocuSign"],
      topStrengths: ["6 years of legal experience", "Corporate in-house background", "Multilingual (3 languages)"],
      topConcerns: ["In-house only — no law firm experience", "Title mismatch — legal assistant vs. secretary"],
      riskFlags: [],
      aiSummary: "In-house corporate legal background with solid skills. Law firm transition is the main risk factor — worth a call to assess motivation and adaptability.",
      createdAt: daysAgo(1),
    },
  });

  // ── REVIEWED ──────────────────────────────────────────────────────────────

  const aaliyahWashington = await prisma.candidate.create({
    data: {
      firstName: "Aaliyah",
      lastName: "Washington",
      displayName: "Washington, Aaliyah",
      resumeEmail: "aaliyah.w@email.com",
      resumePhone: "(312) 555-2004",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Cook County Public Defender's Office",
      currentTitle: "Paralegal",
      yearsOfExperience: 4,
      workHistorySummary: "4 years as a paralegal in the Cook County Public Defender's Office. Heavy caseload management, client interaction, and courtroom support. Transitioning from government to private sector seeking higher compensation.",
      educationDegree: "Bachelor of Science",
      educationMajor: "Criminal Justice",
      educationInstitution: "Chicago State University",
      educationYear: 2019,
      certifications: ["NALA Paralegal Certificate"],
      languages: ["English"],
      availabilityNotes: "Flexible, 2-week notice",
      desiredSalary: 58000,
      source: "ZipRecruiter",
      appliedRole: "Litigation Paralegal",
      status: "REVIEWED",
      reviewedAt: daysAgo(2),
      aiCompositeScore: 68,
      aiTier: "TIER_2",
      aiTriageAction: "ADVANCE_SCHEDULE_REVIEW",
      aiDetectedRoleType: "PARALEGAL",
      scoreLawFirmExp: 2,
      scoreLongevity: 4,
      scoreTitleSpecific: 4,
      scoreTechnicalSkills: 3,
      scoreProfessionalism: 4,
      practiceAreas: ["Criminal Defense", "Litigation"],
      keySkills: ["Case management", "Client interviews", "Court filings", "Legal research"],
      topStrengths: ["Strong work ethic and stability", "Real courtroom/litigation exposure", "NALA certified"],
      topConcerns: ["Government background — no private law firm experience", "Criminal defense focus may not transfer to civil litigation"],
      riskFlags: [],
      aiSummary: "Solid candidate with genuine litigation experience, but government background is a differentiator. Worth a screening call to assess fit for civil litigation roles.",
    },
  });

  const jamesWhitfield = await prisma.candidate.create({
    data: {
      firstName: "James",
      lastName: "Whitfield",
      displayName: "Whitfield, James",
      resumeEmail: "james.whitfield@email.com",
      resumePhone: "(630) 555-2005",
      candidateCity: "Oak Park",
      candidateState: "IL",
      candidateLocation: "Oak Park, IL",
      currentEmployer: "Self-employed (contract)",
      currentTitle: "Contract Paralegal",
      yearsOfExperience: 3,
      workHistorySummary: "3 years of contract paralegal work across multiple firm placements. Varied experience in corporate and real estate matters. Gaps between assignments.",
      educationDegree: "Bachelor of Arts",
      educationMajor: "English",
      educationInstitution: "Northern Illinois University",
      educationYear: 2020,
      certifications: ["ABA-Approved Paralegal Certificate – Loyola University Chicago"],
      languages: ["English"],
      availabilityNotes: "Available immediately — currently between contracts",
      desiredSalary: 52000,
      source: "ZipRecruiter",
      appliedRole: "Corporate Paralegal",
      status: "REVIEWED",
      reviewedAt: daysAgo(4),
      aiCompositeScore: 58,
      aiTier: "TIER_3",
      aiTriageAction: "HOLD_RECRUITER_JUDGMENT",
      aiDetectedRoleType: "PARALEGAL",
      scoreLawFirmExp: 3,
      scoreLongevity: 2,
      scoreTitleSpecific: 3,
      scoreTechnicalSkills: 3,
      scoreProfessionalism: 3,
      practiceAreas: ["Corporate", "Real Estate"],
      keySkills: ["Entity formation", "Contract review", "Due diligence"],
      topStrengths: ["Recent paralegal certificate", "Corporate transactional exposure"],
      topConcerns: ["Limited experience (3 years)", "Contract-only history suggests instability", "No M&A-specific experience"],
      riskFlags: ["Employment gaps between contract placements"],
      aiSummary: "Junior candidate with contract background. May be suitable for entry-level roles but lacks the depth required for Voss & Stratton's M&A paralegal position.",
    },
  });

  // ── ACTIVE — submitted to jobs, various pipeline stages ──────────────────

  const mariaJohnson = await prisma.candidate.create({
    data: {
      firstName: "Maria",
      lastName: "Johnson",
      displayName: "Johnson, Maria",
      resumeEmail: "maria.johnson@email.com",
      resumePhone: "(312) 555-2006",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Hartwell & Barnes LLP",
      currentTitle: "Senior Litigation Paralegal",
      yearsOfExperience: 8,
      workHistorySummary: "8 years supporting litigation partners at mid-size Chicago law firms. Deep experience in commercial disputes, insurance defense, and class actions. Supervised two junior paralegals at current firm.",
      educationDegree: "Bachelor of Science",
      educationMajor: "Political Science",
      educationInstitution: "DePaul University",
      educationYear: 2015,
      certifications: ["NALA Paralegal Certificate"],
      languages: ["English", "Spanish (conversational)"],
      availabilityNotes: "Available with 2 weeks notice",
      desiredSalary: 68000,
      source: "ZipRecruiter",
      appliedRole: "Litigation Paralegal",
      status: "ACTIVE",
      reviewedAt: daysAgo(10),
      aiCompositeScore: 88,
      aiTier: "TIER_1",
      aiTriageAction: "ADVANCE_PRIORITY_CALL",
      aiDetectedRoleType: "PARALEGAL",
      scoreLawFirmExp: 5,
      scoreLongevity: 4,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 4,
      scoreProfessionalism: 5,
      practiceAreas: ["Commercial Litigation", "Insurance Defense", "Class Actions"],
      keySkills: ["Case management", "iManage", "E-filing", "Deposition prep", "Trial support"],
      topStrengths: ["Deep litigation paralegal experience", "Team leadership background", "Downtown Chicago firm experience"],
      topConcerns: ["Salary expectation slightly above range"],
      riskFlags: [],
      aiSummary: "Highly experienced litigation paralegal with 8 years at comparable Chicago firms. Strong candidate for Harrington & Cole — exceeds most requirements.",
    },
  });

  const danielPark = await prisma.candidate.create({
    data: {
      firstName: "Daniel",
      lastName: "Park",
      displayName: "Park, Daniel",
      resumeEmail: "dpark@email.com",
      resumePhone: "(312) 555-2007",
      candidateCity: "Evanston",
      candidateState: "IL",
      candidateLocation: "Evanston, IL",
      currentEmployer: "Meridian Trust Company",
      currentTitle: "Legal Billing Analyst",
      yearsOfExperience: 5,
      workHistorySummary: "5 years in legal billing at financial services and law firm environments. Proficient in Aderant, Elite, and e-billing platforms. Strong attention to detail and process orientation.",
      educationDegree: "Bachelor of Business Administration",
      educationMajor: "Finance",
      educationInstitution: "University of Illinois Chicago",
      educationYear: 2018,
      certifications: [],
      languages: ["English", "Korean"],
      availabilityNotes: "Open to hybrid arrangements",
      desiredSalary: 60000,
      source: "ZipRecruiter",
      appliedRole: "Billing Coordinator",
      status: "ACTIVE",
      reviewedAt: daysAgo(15),
      aiCompositeScore: 76,
      aiTier: "TIER_2",
      aiTriageAction: "ADVANCE_SCHEDULE_REVIEW",
      aiDetectedRoleType: "BILLING_COORDINATOR",
      scoreLawFirmExp: 3,
      scoreLongevity: 4,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 5,
      scoreProfessionalism: 4,
      practiceAreas: ["Corporate Legal", "Financial Services"],
      keySkills: ["Aderant", "Elite 3E", "E-billing", "Excel", "Budget tracking", "Accruals"],
      topStrengths: ["Direct billing software experience", "Financial services background matches client"],
      topConcerns: ["No law firm background — only in-house"],
      riskFlags: [],
      aiSummary: "Strong billing technical skills. In-house financial services background is a good match for Meridian Financial Group.",
    },
  });

  const thomasWright = await prisma.candidate.create({
    data: {
      firstName: "Thomas",
      lastName: "Wright",
      displayName: "Wright, Thomas",
      resumeEmail: "thomas.wright@email.com",
      resumePhone: "(847) 555-2008",
      candidateCity: "Schaumburg",
      candidateState: "IL",
      candidateLocation: "Schaumburg, IL",
      currentEmployer: "Baxter International (Legal Dept.)",
      currentTitle: "Billing Specialist",
      yearsOfExperience: 7,
      workHistorySummary: "7 years managing outside counsel billing for a large corporate legal department. Expert in e-billing platforms, budget variance analysis, and vendor relationships. Led a billing system migration project.",
      educationDegree: "Bachelor of Science",
      educationMajor: "Accounting",
      educationInstitution: "Loyola University Chicago",
      educationYear: 2016,
      certifications: ["Certified Legal Biller (CLB)"],
      languages: ["English"],
      availabilityNotes: "Currently employed, available with 3 weeks notice",
      desiredSalary: 63000,
      source: "ZipRecruiter",
      appliedRole: "Billing Coordinator",
      status: "ACTIVE",
      reviewedAt: daysAgo(20),
      aiCompositeScore: 84,
      aiTier: "TIER_1",
      aiTriageAction: "ADVANCE_PRIORITY_CALL",
      aiDetectedRoleType: "BILLING_COORDINATOR",
      scoreLawFirmExp: 3,
      scoreLongevity: 5,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 5,
      scoreProfessionalism: 4,
      practiceAreas: ["Corporate Legal"],
      keySkills: ["E-billing", "Aderant", "Budget analysis", "Outside counsel management", "Excel", "Process improvement"],
      topStrengths: ["CLB certification", "Corporate in-house exactly matches client environment", "Led billing system migration"],
      topConcerns: ["No law firm side billing experience"],
      riskFlags: [],
      aiSummary: "Senior billing specialist with strong in-house corporate background. Excellent fit for Meridian Financial. CLB certification is a standout credential.",
    },
  });

  // ── SUBMITTED (just sent to client) ──────────────────────────────────────

  const sophiaMartinez = await prisma.candidate.create({
    data: {
      firstName: "Sophia",
      lastName: "Martinez",
      displayName: "Martinez, Sophia",
      resumeEmail: "sophia.m@email.com",
      resumePhone: "(773) 555-2009",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Alvarez & Associates",
      currentTitle: "Legal Secretary",
      yearsOfExperience: 11,
      workHistorySummary: "Over 11 years as a legal secretary at downtown Chicago boutique and mid-size firms. Expert-level Word and document formatting. Supported corporate and transactional practice groups.",
      educationDegree: "Associate of Applied Science",
      educationMajor: "Legal Office Administration",
      educationInstitution: "City Colleges of Chicago",
      educationYear: 2012,
      certifications: ["Microsoft Office Specialist – Word"],
      languages: ["English", "Spanish (fluent)"],
      typingWpm: 85,
      availabilityNotes: "Available immediately",
      desiredSalary: 54000,
      source: "ZipRecruiter",
      appliedRole: "Legal Secretary – Corporate",
      status: "ACTIVE",
      reviewedAt: daysAgo(9),
      aiCompositeScore: 82,
      aiTier: "TIER_1",
      aiTriageAction: "ADVANCE_PRIORITY_CALL",
      aiDetectedRoleType: "LEGAL_SECRETARY",
      scoreLawFirmExp: 5,
      scoreLongevity: 5,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 4,
      scoreProfessionalism: 4,
      practiceAreas: ["Corporate", "Transactional", "Real Estate"],
      keySkills: ["Microsoft Word", "Document formatting", "Calendar management", "iManage", "Docketing"],
      topStrengths: ["Exceptional tenure and stability", "Exact title and practice area match", "Bilingual"],
      topConcerns: ["Associate degree only — some firms prefer bachelor's"],
      riskFlags: [],
      aiSummary: "Exceptional legal secretary with 11 years of stable downtown law firm experience. Strong match for the corporate secretary role at Harrington & Cole.",
    },
  });

  // ── INTERVIEWING ──────────────────────────────────────────────────────────

  const carlosMendez = await prisma.candidate.create({
    data: {
      firstName: "Carlos",
      lastName: "Mendez",
      displayName: "Mendez, Carlos",
      resumeEmail: "carlos.mendez@email.com",
      resumePhone: "(312) 555-2010",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Sullivan & Cromwell (Chicago Office)",
      currentTitle: "Corporate Paralegal",
      yearsOfExperience: 5,
      workHistorySummary: "5 years as a corporate paralegal at a national firm's Chicago office. Focused on M&A support, entity management, and transactional closings. Supported 3 significant acquisitions in the past 18 months.",
      educationDegree: "Bachelor of Science",
      educationMajor: "Finance",
      educationInstitution: "University of Illinois at Urbana-Champaign",
      educationYear: 2018,
      certifications: ["NALA Advanced Paralegal Certification"],
      languages: ["English", "Spanish (fluent)"],
      availabilityNotes: "Seeking change — available with 2 weeks notice",
      desiredSalary: 70000,
      source: "ZipRecruiter",
      appliedRole: "Corporate Paralegal",
      status: "ACTIVE",
      reviewedAt: daysAgo(18),
      followUpDate: daysFromNow(6),
      aiCompositeScore: 79,
      aiTier: "TIER_2",
      aiTriageAction: "ADVANCE_SCHEDULE_REVIEW",
      aiDetectedRoleType: "PARALEGAL",
      scoreLawFirmExp: 4,
      scoreLongevity: 4,
      scoreTitleSpecific: 4,
      scoreTechnicalSkills: 4,
      scoreProfessionalism: 4,
      practiceAreas: ["Corporate", "M&A", "Transactional"],
      keySkills: ["Entity management", "M&A support", "Closing checklists", "Cap tables", "iManage"],
      topStrengths: ["National firm experience", "Direct M&A support background", "Bilingual"],
      topConcerns: ["Salary expectation at upper end of range"],
      riskFlags: [],
      aiSummary: "Well-rounded corporate paralegal with direct M&A experience from a national firm. Strong match for Voss & Stratton — interview scheduled.",
    },
  });

  // ── PLACED — with financial data ──────────────────────────────────────────

  const rachelTorres = await prisma.candidate.create({
    data: {
      firstName: "Rachel",
      lastName: "Torres",
      displayName: "Torres, Rachel",
      resumeEmail: "rtorres@email.com",
      resumePhone: "(312) 555-2011",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Voss & Stratton",
      currentTitle: "Corporate Paralegal",
      yearsOfExperience: 7,
      workHistorySummary: "7 years as a corporate paralegal at a top-25 Chicago firm specializing in M&A and private equity transactions. Placed at Voss & Stratton by CRI 6 weeks ago. Now the primary paralegal supporting two partners.",
      educationDegree: "Bachelor of Science",
      educationMajor: "Business Administration",
      educationInstitution: "Loyola University Chicago",
      educationYear: 2016,
      certifications: ["NALA Advanced Paralegal Certification", "Notary Public – Illinois"],
      barAdmissions: [],
      languages: ["English", "Portuguese (fluent)"],
      availabilityNotes: "Placed — not available",
      desiredSalary: 74000,
      source: "ZipRecruiter",
      appliedRole: "Corporate Paralegal",
      status: "PLACED",
      reviewedAt: daysAgo(55),
      aiCompositeScore: 94,
      aiTier: "TIER_1",
      aiTriageAction: "ADVANCE_PRIORITY_CALL",
      aiDetectedRoleType: "PARALEGAL",
      scoreLawFirmExp: 5,
      scoreLongevity: 5,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 5,
      scoreProfessionalism: 5,
      practiceAreas: ["Corporate", "M&A", "Private Equity", "Securities"],
      keySkills: ["Entity management", "Due diligence", "Cap tables", "Closing checklists", "iManage", "Carta"],
      topStrengths: ["Exact M&A paralegal role match", "Top-firm pedigree", "7 years of high-quality tenure", "Multilingual"],
      topConcerns: [],
      riskFlags: [],
      aiSummary: "Exceptional corporate/M&A paralegal. Placed at Voss & Stratton — outstanding outcome for the client.",
    },
  });

  const briannaLee = await prisma.candidate.create({
    data: {
      firstName: "Brianna",
      lastName: "Lee",
      displayName: "Lee, Brianna",
      resumeEmail: "brianna.lee@email.com",
      resumePhone: "(312) 555-2012",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Meridian Financial Group",
      currentTitle: "Billing Coordinator",
      yearsOfExperience: 6,
      workHistorySummary: "6 years in legal billing, most recently managing outside counsel invoices for a Fortune 500 legal department. Expert in Aderant and e-billing. Placed at Meridian Financial by CRI 5 weeks ago.",
      educationDegree: "Bachelor of Business Administration",
      educationMajor: "Accounting",
      educationInstitution: "DePaul University",
      educationYear: 2017,
      certifications: ["Certified Legal Biller (CLB)", "Notary Public – Illinois"],
      languages: ["English"],
      availabilityNotes: "Placed — not available",
      desiredSalary: 62000,
      source: "ZipRecruiter",
      appliedRole: "Billing Coordinator",
      status: "PLACED",
      reviewedAt: daysAgo(50),
      aiCompositeScore: 87,
      aiTier: "TIER_1",
      aiTriageAction: "ADVANCE_PRIORITY_CALL",
      aiDetectedRoleType: "BILLING_COORDINATOR",
      scoreLawFirmExp: 3,
      scoreLongevity: 5,
      scoreTitleSpecific: 5,
      scoreTechnicalSkills: 5,
      scoreProfessionalism: 5,
      practiceAreas: ["Corporate Legal", "Financial Services"],
      keySkills: ["Aderant", "E-billing", "Budget management", "Accruals", "Outside counsel management"],
      topStrengths: ["CLB certified", "Exact role and environment match", "Strong tenure"],
      topConcerns: [],
      riskFlags: [],
      aiSummary: "Strong billing professional placed successfully at Meridian Financial Group. Excellent CRI placement outcome.",
    },
  });

  // ── ON_HOLD ────────────────────────────────────────────────────────────────

  const kevinOBrien = await prisma.candidate.create({
    data: {
      firstName: "Kevin",
      lastName: "O'Brien",
      displayName: "O'Brien, Kevin",
      resumeEmail: "kevin.obrien@email.com",
      resumePhone: "(847) 555-2013",
      candidateCity: "Skokie",
      candidateState: "IL",
      candidateLocation: "Skokie, IL",
      currentEmployer: "Retired / Re-entering workforce",
      currentTitle: "Former Legal Secretary",
      yearsOfExperience: 14,
      workHistorySummary: "14 years at a large Chicago firm followed by a 4-year career gap for family caregiving. Now seeking to re-enter the legal field. Strong legacy skills in Word Perfect and document management, but technology skills need updating.",
      educationDegree: "Bachelor of Arts",
      educationMajor: "Communications",
      educationInstitution: "Northeastern Illinois University",
      educationYear: 1999,
      certifications: [],
      languages: ["English"],
      availabilityNotes: "Available immediately",
      desiredSalary: 48000,
      source: "ZipRecruiter",
      appliedRole: "Legal Secretary – Corporate",
      status: "ON_HOLD",
      reviewedAt: daysAgo(6),
      aiCompositeScore: 44,
      aiTier: "TIER_4",
      aiTriageAction: "HOLD_RECRUITER_JUDGMENT",
      aiDetectedRoleType: "LEGAL_SECRETARY",
      scoreLawFirmExp: 4,
      scoreLongevity: 2,
      scoreTitleSpecific: 3,
      scoreTechnicalSkills: 2,
      scoreProfessionalism: 3,
      practiceAreas: ["General Litigation", "Corporate"],
      keySkills: ["WordPerfect", "Document management", "Calendar management"],
      topStrengths: ["Strong prior law firm experience", "Affordable salary expectation"],
      topConcerns: ["4-year employment gap", "Technology skills significantly outdated", "No modern DMS experience"],
      riskFlags: ["Extended employment gap (2019–2023)", "Outdated software skills — no iManage or modern DMS"],
      aiSummary: "Long career gap and outdated tech skills are significant concerns for current-day firms. May be suitable for smaller firms with less technology focus.",
    },
  });

  // ── DO_NOT_CONSIDER ──────────────────────────────────────────────────────────

  const lauraFoster = await prisma.candidate.create({
    data: {
      firstName: "Laura",
      lastName: "Foster",
      displayName: "Foster, Laura",
      resumeEmail: "laura.foster88@gmail.com",
      resumePhone: "(773) 555-2014",
      candidateCity: "Harvey",
      candidateState: "IL",
      candidateLocation: "Harvey, IL",
      currentEmployer: "Unemployed",
      currentTitle: "Former Legal Receptionist",
      yearsOfExperience: 1,
      workHistorySummary: "1 year as a legal receptionist before the firm closed. Limited legal skills beyond answering phones and greeting clients. Resume showed multiple submission to dozens of firms simultaneously.",
      educationDegree: "High School Diploma",
      educationMajor: null,
      educationInstitution: null,
      educationYear: 2015,
      certifications: [],
      languages: ["English"],
      availabilityNotes: "Available immediately",
      desiredSalary: 42000,
      source: "ZipRecruiter",
      appliedRole: "Legal Assistant – Temp to Hire",
      status: "DO_NOT_CONSIDER",
      reviewedAt: daysAgo(8),
      aiCompositeScore: 18,
      aiTier: "TIER_4",
      aiTriageAction: "PASS_DO_NOT_SUBMIT",
      aiDetectedRoleType: "LEGAL_ASSISTANT",
      scoreLawFirmExp: 1,
      scoreLongevity: 1,
      scoreTitleSpecific: 1,
      scoreTechnicalSkills: 1,
      scoreProfessionalism: 2,
      practiceAreas: [],
      keySkills: ["Phone", "Reception"],
      topStrengths: [],
      topConcerns: ["No substantive legal skills", "Mass-applied to multiple firms"],
      riskFlags: ["Mass job application behavior detected", "No transferable legal skills"],
      aiSummary: "Not suitable for any current openings. Flagged for do-not-submit based on skills gap and mass-application behavior.",
    },
  });

  // ── RESUM8 IMPORTS (no AI scores) ─────────────────────────────────────────

  const patriciaChen = await prisma.candidate.create({
    data: {
      firstName: "Patricia",
      lastName: "Chen",
      displayName: "Chen, Patricia",
      resumeEmail: "p.chen.legal@email.com",
      resumePhone: "(312) 555-3001",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Morrison & Foerster LLP",
      currentTitle: "Senior Paralegal",
      yearsOfExperience: 12,
      workHistorySummary: "12 years of paralegal experience across major Chicago and national law firms. Specializes in complex commercial litigation and international arbitration. Former candidate in Resum8 system.",
      educationDegree: "Bachelor of Arts",
      educationMajor: "Political Science",
      educationInstitution: "Northwestern University",
      educationYear: 2010,
      certifications: ["NALA Advanced Paralegal Certification"],
      languages: ["English", "Mandarin (fluent)"],
      availabilityNotes: "Passively looking — not urgent",
      desiredSalary: 80000,
      source: "RESUMate",
      appliedRole: null,
      status: "REVIEWED",
      reviewedAt: daysAgo(30),
      originalEntryDate: daysAgo(3 * 365), // Originally entered ~3 years ago
      // AI scores are null for RESUMate imports
      aiCompositeScore: null,
      aiTier: null,
      aiTriageAction: null,
      aiDetectedRoleType: null,
      practiceAreas: ["Commercial Litigation", "International Arbitration"],
      keySkills: ["Complex litigation support", "International matters", "Trial prep", "iManage"],
      topStrengths: [],
      topConcerns: [],
      riskFlags: [],
      aiSummary: null,
    },
  });

  const davidKowalski = await prisma.candidate.create({
    data: {
      firstName: "David",
      lastName: "Kowalski",
      displayName: "Kowalski, David",
      resumeEmail: "dkowalski@email.com",
      resumePhone: "(773) 555-3002",
      candidateCity: "Berwyn",
      candidateState: "IL",
      candidateLocation: "Berwyn, IL",
      currentEmployer: "Retired",
      currentTitle: "Former Legal Secretary",
      yearsOfExperience: 20,
      workHistorySummary: "20 years as a legal secretary at two large Chicago law firms. Retired 3 years ago, now seeking part-time or temp work. Strong legacy skills, document management expertise. Former candidate in Resum8 system.",
      educationDegree: "Associate of Applied Science",
      educationMajor: "Office Administration",
      educationInstitution: "Morton College",
      educationYear: 1992,
      certifications: [],
      languages: ["English", "Polish"],
      availabilityNotes: "Seeking part-time or temp engagements only",
      desiredSalary: 40000,
      source: "RESUMate",
      appliedRole: null,
      status: "ACTIVE",
      reviewedAt: daysAgo(20),
      originalEntryDate: daysAgo(2 * 365), // Originally entered ~2 years ago
      // AI scores null for RESUMate imports
      aiCompositeScore: null,
      aiTier: null,
      aiTriageAction: null,
      aiDetectedRoleType: null,
      practiceAreas: ["General Litigation", "Corporate"],
      keySkills: ["Document management", "Word", "Docketing", "Calendar management"],
      topStrengths: [],
      topConcerns: [],
      riskFlags: [],
      aiSummary: null,
    },
  });

  const sandraWilliams = await prisma.candidate.create({
    data: {
      firstName: "Sandra",
      lastName: "Williams",
      displayName: "Williams, Sandra",
      resumeEmail: "sandra.williams.legal@email.com",
      resumePhone: "(312) 555-3003",
      candidateCity: "Oak Park",
      candidateState: "IL",
      candidateLocation: "Oak Park, IL",
      currentEmployer: "Thompson Coburn LLP",
      currentTitle: "Paralegal",
      yearsOfExperience: 9,
      workHistorySummary: "9 years as a paralegal at regional and national law firms, with focus on real estate and corporate transactions. Former CRI candidate from Resum8 system — previously placed in 2019.",
      educationDegree: "Bachelor of Business Administration",
      educationMajor: "Real Estate",
      educationInstitution: "Marquette University",
      educationYear: 2014,
      certifications: ["NALA Paralegal Certificate", "IL Real Estate License (inactive)"],
      languages: ["English"],
      availabilityNotes: "Open to new opportunities, 3-week notice",
      desiredSalary: 72000,
      source: "RESUMate",
      appliedRole: null,
      status: "REVIEWED",
      reviewedAt: daysAgo(15),
      originalEntryDate: daysAgo(4 * 365), // Originally entered ~4 years ago — previously placed in 2019
      // AI scores null for RESUMate imports
      aiCompositeScore: null,
      aiTier: null,
      aiTriageAction: null,
      aiDetectedRoleType: null,
      practiceAreas: ["Real Estate", "Corporate", "Transactional"],
      keySkills: ["Real estate closings", "Entity management", "Title review", "iManage"],
      topStrengths: [],
      topConcerns: [],
      riskFlags: [],
      aiSummary: null,
    },
  });

  // ── MANUALLY ENTERED (recruiter added directly — no n8n workflow) ──────────

  const michaelReyes = await prisma.candidate.create({
    data: {
      firstName: "Michael",
      lastName: "Reyes",
      resumeEmail: "mreyes.legal@gmail.com",
      resumePhone: "(312) 555-4001",
      candidateCity: "Chicago",
      candidateState: "IL",
      candidateLocation: "Chicago, IL",
      currentEmployer: "Kirkland & Ellis LLP",
      currentTitle: "Litigation Paralegal",
      yearsOfExperience: 9,
      workHistorySummary: "9 years as a litigation paralegal at major Chicago law firms including Kirkland & Ellis. Deep expertise in complex commercial litigation and federal court practice. Referred to CRI by a former placed candidate.",
      educationDegree: "Bachelor of Arts",
      educationMajor: "Political Science",
      educationInstitution: "University of Chicago",
      educationYear: 2014,
      certifications: ["NALA Advanced Paralegal Certification"],
      languages: ["English", "Spanish (fluent)"],
      availabilityNotes: "Actively looking — 2 weeks notice",
      desiredSalary: 72000,
      source: "Manual Entry",
      appliedRole: null,
      status: "ACTIVE",
      reviewedAt: daysAgo(5),
      // No AI scores — manually entered, not through n8n workflow
      aiCompositeScore: null,
      aiTier: null,
      aiTriageAction: null,
      aiDetectedRoleType: "PARALEGAL",
      practiceAreas: ["Commercial Litigation", "Federal Court", "Insurance Defense"],
      keySkills: ["Case management", "iManage", "E-filing", "Deposition prep", "Trial support"],
      topStrengths: [],
      topConcerns: [],
      riskFlags: [],
      aiSummary: null,
      // Recruiter set a manual score since no AI score
      // (effectiveScore is a DB generated column — computed automatically from manualScore)
      manualScore: 85,
      useManualScore: true,
      createdAt: daysAgo(5),
    },
  });

  const angelaVargas = await prisma.candidate.create({
    data: {
      firstName: "Angela",
      lastName: "Vargas",
      resumeEmail: "angela.vargas@email.com",
      resumePhone: "(773) 555-4002",
      candidateCity: "Berwyn",
      candidateState: "IL",
      candidateLocation: "Berwyn, IL",
      currentEmployer: "Self",
      currentTitle: "Freelance Legal Secretary",
      yearsOfExperience: 15,
      workHistorySummary: "15 years as a legal secretary, most recently freelancing for small firms. Extensive experience in corporate and estate planning practices. Called CRI directly after seeing a job posting for one of our clients.",
      educationDegree: "Associate of Applied Science",
      educationMajor: "Legal Office Technology",
      educationInstitution: "Triton College",
      educationYear: 2008,
      certifications: ["Microsoft Office Specialist – Word", "Notary Public – Illinois"],
      languages: ["English", "Spanish (conversational)"],
      typingWpm: 90,
      availabilityNotes: "Available immediately",
      desiredSalary: 52000,
      source: "Manual Entry",
      appliedRole: null,
      status: "REVIEWED",
      reviewedAt: daysAgo(3),
      // No AI scores — manually entered
      aiCompositeScore: null,
      aiTier: null,
      aiTriageAction: null,
      aiDetectedRoleType: "LEGAL_SECRETARY",
      practiceAreas: ["Corporate", "Estate Planning", "Transactional"],
      keySkills: ["Microsoft Word", "Document formatting", "Calendar management", "Docketing", "Client intake"],
      topStrengths: [],
      topConcerns: [],
      riskFlags: [],
      aiSummary: null,
      createdAt: daysAgo(3),
    },
  });

  const totalCandidates = 17;
  console.log(`✓ Created ${totalCandidates} candidates (12 ZipRecruiter, 3 RESUMate, 2 Manual Entry)`);

  // ── SUBMISSIONS ────────────────────────────────────────────────────────────

  // Maria Johnson → Litigation Paralegal (INTERVIEW_COMPLETED — client positive feedback)
  await prisma.submission.create({
    data: {
      candidateId: mariaJohnson.id,
      jobOrderId: jobLitigationPara.id,
      submittedById: admin.id,
      status: "INTERVIEW_COMPLETED",
      interviewDate: daysAgo(5),
      clientFeedback: "Very impressed with Maria — partners said she was the strongest candidate they've met. Awaiting decision.",
      createdAt: daysAgo(12),
    },
  });

  // Aaliyah Washington → Litigation Paralegal (SUBMITTED)
  await prisma.submission.create({
    data: {
      candidateId: aaliyahWashington.id,
      jobOrderId: jobLitigationPara.id,
      submittedById: admin.id,
      status: "SUBMITTED",
      createdAt: daysAgo(2),
    },
  });

  // Jennifer Kim → Litigation Paralegal (SUBMITTED — just sent)
  await prisma.submission.create({
    data: {
      candidateId: jenKim.id,
      jobOrderId: jobLitigationPara.id,
      submittedById: admin.id,
      status: "SUBMITTED",
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    },
  });

  // Sophia Martinez → Legal Secretary – Corporate (CLIENT_REVIEW)
  await prisma.submission.create({
    data: {
      candidateId: sophiaMartinez.id,
      jobOrderId: jobLegalSecretary.id,
      submittedById: admin.id,
      status: "CLIENT_REVIEW",
      clientFeedback: "Harrington team reviewing — Jennifer Walsh said she looks promising.",
      createdAt: daysAgo(5),
    },
  });

  // Daniel Park → Billing Coordinator (SUBMITTED)
  // Note: job is FILLED but Park was the runner-up — submitted before Brianna was placed
  await prisma.submission.create({
    data: {
      candidateId: danielPark.id,
      jobOrderId: jobBillingCoord.id,
      submittedById: admin.id,
      status: "REJECTED_BY_CLIENT",
      clientFeedback: "Client preferred a candidate with CLB certification. Good candidate — keep on file.",
      createdAt: daysAgo(35),
    },
  });

  // Thomas Wright → Billing Coordinator (OFFER_EXTENDED — second opening)
  // Note: Meridian loved Thomas too and opened a second role
  const jobBillingCoord2 = await prisma.jobOrder.create({
    data: {
      title: "Senior Billing Coordinator",
      clientId: meridian.id,
      clientName: "Meridian Financial Group",
      location: "Chicago, IL (Hybrid)",
      jobType: "DIRECT_HIRE",
      status: "OPEN",
      roleType: "BILLING_COORDINATOR",
      practiceAreas: ["Corporate Legal"],
      requiredSkills: ["Aderant", "E-billing", "Outside counsel management", "Budget analysis"],
      salaryMin: 58000,
      salaryMax: 72000,
      priority: 1,
      description: "Meridian expanded their legal operations team. Seeking a senior billing professional to take over outside counsel management program.",
      internalNotes: "Opened after Brianna Lee placement — Meridian is on a hiring run.",
      openedAt: daysAgo(10),
      targetFillDate: daysFromNow(14),
      assignedToId: admin.id,
    },
  });

  await prisma.submission.create({
    data: {
      candidateId: thomasWright.id,
      jobOrderId: jobBillingCoord2.id,
      submittedById: admin.id,
      status: "OFFER_EXTENDED",
      offerAmount: 65000,
      clientFeedback: "Meridian is very excited about Thomas. Offer letter sent — waiting on response.",
      createdAt: daysAgo(18),
    },
  });

  // Carlos Mendez → Corporate Paralegal (INTERVIEW_SCHEDULED — 5 days out)
  // Note: Rachel was placed at main Voss role; this is a second Voss opening
  const jobCorporatePara2 = await prisma.jobOrder.create({
    data: {
      title: "Corporate Paralegal – M&A Team",
      clientId: voss.id,
      clientName: "Voss & Stratton",
      location: "Naperville, IL",
      jobType: "DIRECT_HIRE",
      status: "OPEN",
      roleType: "PARALEGAL",
      practiceAreas: ["Corporate", "M&A"],
      requiredSkills: ["M&A support", "Entity management", "Due diligence", "iManage"],
      salaryMin: 65000,
      salaryMax: 80000,
      priority: 1,
      description: "Following the successful hire last month, Voss & Stratton is seeking a second corporate paralegal for their growing M&A practice.",
      internalNotes: "Robert Voss specifically requested someone from Carlos's background — national firm M&A experience.",
      openedAt: daysAgo(12),
      targetFillDate: daysFromNow(18),
      assignedToId: admin.id,
    },
  });

  await prisma.submission.create({
    data: {
      candidateId: carlosMendez.id,
      jobOrderId: jobCorporatePara2.id,
      submittedById: admin.id,
      status: "INTERVIEW_SCHEDULED",
      interviewDate: daysFromNow(5),
      clientFeedback: "Robert Voss reviewed his materials and wants to meet ASAP.",
      createdAt: daysAgo(10),
    },
  });

  // Rachel Torres → Corporate Paralegal (PLACED — 6 weeks ago)
  await prisma.submission.create({
    data: {
      candidateId: rachelTorres.id,
      jobOrderId: jobCorporatePara.id,
      submittedById: admin.id,
      status: "PLACED",
      interviewDate: daysAgo(50),
      offerAmount: 74000,
      placementFee: 11100, // 15%
      placedAt: daysAgo(42),
      clientFeedback: "Robert Voss said she was exactly what they needed. Excellent placement.",
      createdAt: daysAgo(55),
    },
  });

  // Brianna Lee → Billing Coordinator (PLACED — 5 weeks ago)
  await prisma.submission.create({
    data: {
      candidateId: briannaLee.id,
      jobOrderId: jobBillingCoord.id,
      submittedById: admin.id,
      status: "PLACED",
      interviewDate: daysAgo(46),
      offerAmount: 62000,
      placementFee: 7440, // 12%
      placedAt: daysAgo(35),
      clientFeedback: "Patricia Nguyen raved about Brianna. Smooth placement process.",
      createdAt: daysAgo(50),
    },
  });

  // David Kowalski (Resum8) → Legal Assistant – Temp to Hire (SUBMITTED)
  await prisma.submission.create({
    data: {
      candidateId: davidKowalski.id,
      jobOrderId: jobLegalAssist.id,
      submittedById: admin.id,
      status: "SUBMITTED",
      createdAt: daysAgo(3),
    },
  });

  console.log("✓ Created submissions");

  // ── NOTES ─────────────────────────────────────────────────────────────────

  await prisma.note.createMany({
    data: [
      {
        content: "Spoke with Maria — she's very interested in the Harrington role. She mentioned she managed a team of 2 junior paralegals. Strong communicator on the phone. Recommend moving to offer discussion after client debrief.",
        type: "INTERNAL",
        candidateId: mariaJohnson.id,
        authorId: admin.id,
        createdAt: daysAgo(11),
      },
      {
        content: "Interview feedback from Harrington & Cole: Partners were impressed. Jennifer Walsh said 'one of the strongest we've seen in years.' Waiting on formal approval from managing partner.",
        type: "CLIENT_FEEDBACK",
        candidateId: mariaJohnson.id,
        authorId: admin.id,
        createdAt: daysAgo(5),
      },
      {
        content: "Carlos confirmed interview with Robert Voss for 9 AM. Sent him the Voss & Stratton overview and deal list. He said M&A work at Sullivan was heavily PE-focused — a great match.",
        type: "INTERNAL",
        candidateId: carlosMendez.id,
        authorId: admin.id,
        createdAt: daysAgo(8),
      },
      {
        content: "Patricia is passively looking — imported from Resum8. Called her today to reconnect. She's open to hearing about senior roles $75k+. Strong candidate for any complex litigation or international role. Will circle back when appropriate opening arises.",
        type: "INTERNAL",
        candidateId: patriciaChen.id,
        authorId: admin.id,
        createdAt: daysAgo(28),
      },
      {
        content: "Rachel officially started at Voss & Stratton on Monday. Robert Voss called to say she hit the ground running. Great placement — asked CRI to keep them in mind for future hires.",
        type: "INTERNAL",
        candidateId: rachelTorres.id,
        authorId: admin.id,
        createdAt: daysAgo(40),
      },
      {
        content: "Brianna is thriving at Meridian. Patricia Nguyen emailed to say the billing backlog is already improving. Asked if we have other candidates for their expanding team — hence the new Senior Billing Coordinator req.",
        type: "INTERNAL",
        candidateId: briannaLee.id,
        authorId: admin.id,
        createdAt: daysAgo(30),
      },
    ],
  });

  // ── ACTIVITY LOG ──────────────────────────────────────────────────────────

  await prisma.activityLog.createMany({
    data: [
      {
        type: "SUBMITTED_TO_JOB",
        description: `Submitted Maria Johnson to Litigation Paralegal at Harrington & Cole LLP`,
        candidateId: mariaJohnson.id,
        jobOrderId: jobLitigationPara.id,
        userId: admin.id,
        createdAt: daysAgo(12),
      },
      {
        type: "SUBMISSION_STATUS_CHANGED",
        description: `Interview scheduled for Maria Johnson — Harrington & Cole LLP (Litigation Paralegal)`,
        candidateId: mariaJohnson.id,
        jobOrderId: jobLitigationPara.id,
        userId: admin.id,
        createdAt: daysAgo(9),
        metadata: { from: "SUBMITTED", to: "INTERVIEW_SCHEDULED" },
      },
      {
        type: "SUBMISSION_STATUS_CHANGED",
        description: `Interview completed — Maria Johnson at Harrington & Cole LLP`,
        candidateId: mariaJohnson.id,
        jobOrderId: jobLitigationPara.id,
        userId: admin.id,
        createdAt: daysAgo(5),
        metadata: { from: "INTERVIEW_SCHEDULED", to: "INTERVIEW_COMPLETED" },
      },
      {
        type: "SUBMITTED_TO_JOB",
        description: `Submitted Rachel Torres to Corporate Paralegal at Voss & Stratton`,
        candidateId: rachelTorres.id,
        jobOrderId: jobCorporatePara.id,
        userId: admin.id,
        createdAt: daysAgo(55),
      },
      {
        type: "SUBMISSION_STATUS_CHANGED",
        description: `Rachel Torres PLACED at Voss & Stratton — $74,000 / Fee: $11,100`,
        candidateId: rachelTorres.id,
        jobOrderId: jobCorporatePara.id,
        userId: admin.id,
        createdAt: daysAgo(42),
        metadata: { from: "OFFER_ACCEPTED", to: "PLACED", fee: 11100 },
      },
      {
        type: "SUBMITTED_TO_JOB",
        description: `Submitted Brianna Lee to Billing Coordinator at Meridian Financial Group`,
        candidateId: briannaLee.id,
        jobOrderId: jobBillingCoord.id,
        userId: admin.id,
        createdAt: daysAgo(50),
      },
      {
        type: "SUBMISSION_STATUS_CHANGED",
        description: `Brianna Lee PLACED at Meridian Financial Group — $62,000 / Fee: $7,440`,
        candidateId: briannaLee.id,
        jobOrderId: jobBillingCoord.id,
        userId: admin.id,
        createdAt: daysAgo(35),
        metadata: { from: "OFFER_ACCEPTED", to: "PLACED", fee: 7440 },
      },
      {
        type: "SUBMITTED_TO_JOB",
        description: `Submitted Carlos Mendez to Corporate Paralegal – M&A Team at Voss & Stratton`,
        candidateId: carlosMendez.id,
        jobOrderId: jobCorporatePara2.id,
        userId: admin.id,
        createdAt: daysAgo(10),
      },
      {
        type: "SUBMISSION_STATUS_CHANGED",
        description: `Interview scheduled for Carlos Mendez — Voss & Stratton (${daysFromNow(5).toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
        candidateId: carlosMendez.id,
        jobOrderId: jobCorporatePara2.id,
        userId: admin.id,
        createdAt: daysAgo(8),
        metadata: { from: "SUBMITTED", to: "INTERVIEW_SCHEDULED" },
      },
      {
        type: "SUBMITTED_TO_JOB",
        description: `Submitted Thomas Wright to Senior Billing Coordinator at Meridian Financial Group`,
        candidateId: thomasWright.id,
        jobOrderId: jobBillingCoord2.id,
        userId: admin.id,
        createdAt: daysAgo(18),
      },
      {
        type: "SUBMISSION_STATUS_CHANGED",
        description: `Offer extended to Thomas Wright — Meridian Financial Group ($65,000)`,
        candidateId: thomasWright.id,
        jobOrderId: jobBillingCoord2.id,
        userId: admin.id,
        createdAt: daysAgo(3),
        metadata: { from: "INTERVIEW_COMPLETED", to: "OFFER_EXTENDED", offerAmount: 65000 },
      },
    ],
  });

  console.log("✓ Created notes and activity log");

  // Note: effectiveScore is a PostgreSQL GENERATED ALWAYS AS column.
  // The DB auto-computes it from manualScore/useManualScore/aiCompositeScore — no backfill needed.

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Demo data loaded successfully!

Candidates (17):
  SOURCE: ZipRecruiter (12) — came through n8n workflow
    NEW          — Kim (Tier 1, 91), Thompson (Tier 4, 32), Kapoor (Tier 2, 71)
    REVIEWED     — Washington (Tier 2, 68), Whitfield (Tier 3, 58)
    ACTIVE       — Johnson (interview completed), Park (rejected by client)
                   Wright (offer extended), Martinez (client review)
    INTERVIEWING — Mendez (interview in 5 days at Voss & Stratton)
    PLACED       — Torres ($74k, fee $11,100), Lee ($62k, fee $7,440)
    ON_HOLD      — O'Brien
    DO_NOT_CONSIDER— Foster

  SOURCE: RESUMate (3) — imported from legacy system
    REVIEWED     — Chen (12 yrs, no AI scores), Williams (9 yrs, no AI scores)
    ACTIVE       — Kowalski (20 yrs, submitted to temp role)
    originalEntryDate set on all 3 — "CRI on file since..." will display

  SOURCE: Manual Entry (2) — recruiter added directly
    ACTIVE       — Reyes (manual score 85, paralegal, 9 yrs)
    REVIEWED     — Vargas (no score yet, legal secretary, 15 yrs)

Clients: 3  |  Job orders: 7 (5 original + 2 new openings)
Placements: 2  |  Total fees: $18,540
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
