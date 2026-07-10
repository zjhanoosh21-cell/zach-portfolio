import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "./prisma/dev.db";
const dbPath = path.resolve(process.cwd(), dbUrl);
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── Users ───────────────────────────────────────────────────────────
  const zacharyPassword = process.env.ZACHARY_PASSWORD ?? "password";
  const jamesPassword = process.env.JAMES_PASSWORD ?? "password";

  const zachary = await prisma.user.upsert({
    where: { email: "zachary@corporaterecruitersinc.com" },
    update: {},
    create: {
      email: "zachary@corporaterecruitersinc.com",
      name: "Zachary Hanoosh",
      passwordHash: await bcrypt.hash(zacharyPassword, 10),
    },
  });

  const james = await prisma.user.upsert({
    where: { email: "james@webdev.local" },
    update: {},
    create: {
      email: "james@webdev.local",
      name: "James",
      passwordHash: await bcrypt.hash(jamesPassword, 10),
    },
  });

  console.log(`✓ Users: ${zachary.name}, ${james.name}`);

  // ─── AppSettings ─────────────────────────────────────────────────────
  const rawApiKey = process.env.INTAKE_API_KEY ?? "wbt_intake_key_dev";
  const hashedApiKey = await bcrypt.hash(rawApiKey, 10);
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { apiKey: hashedApiKey },
    create: { id: "singleton", apiKey: hashedApiKey },
  });
  console.log(`✓ AppSettings: API key seeded`);

  // ─── Phases + Tasks ───────────────────────────────────────────────────
  // Due dates relative to seed date (2026-03-18)
  const d = (weeksFromNow: number) => {
    const date = new Date("2026-03-18");
    date.setDate(date.getDate() + weeksFromNow * 7);
    return date;
  };

  const phases = [
    {
      id: "phase-1",
      title: "Phase 1 — Foundation & First Client",
      description:
        "Get the business real. Register a domain, define packages, build portfolio mockups for plumbing sites, and close first paying client through warm network.",
      order: 1,
      tasks: [
        {
          id: "phase-1-task-1",
          title: "Define service packages and set pricing",
          description:
            "Use the Pricing Guide doc in Documents. 3 tiers: Starter ($1.5k), Professional ($3k), Premium ($5k+). Set maintenance retainer at $200/mo.",
          assigneeId: zachary.id,
          status: "done",
          order: 1,
          dueDate: d(0),
        },
        {
          id: "phase-1-task-2",
          title: "Register business domain + set up email",
          description:
            "Register a trade-focused domain (e.g. tradewebstudio.com). Set up Google Workspace with zachary@ and james@ accounts. This is your cold outreach domain — NOT corporaterecruitersinc.com.",
          assigneeId: james.id,
          status: "pending",
          order: 2,
          dueDate: d(1),
        },
        {
          id: "phase-1-task-3",
          title: "Build 2-3 portfolio mockups for plumbing businesses",
          description:
            "Create spec work — pick 2-3 real plumbing companies near you with bad websites. Build what their site could look like. These are your portfolio AND your first cold email attachments.",
          assigneeId: james.id,
          status: "pending",
          order: 3,
          dueDate: d(2),
        },
        {
          id: "phase-1-task-4",
          title: "Launch portfolio site",
          description:
            "Simple 5-page site: Home, Services, Portfolio, About (Zachary + James), Contact. Fast, mobile-first, one clear CTA. This is your #1 sales asset.",
          assigneeId: james.id,
          status: "pending",
          order: 4,
          dueDate: d(2),
        },
        {
          id: "phase-1-task-5",
          title: "Sign service agreement template",
          description:
            "Finalize the contract template in Documents. Review with a lawyer if needed — at minimum make sure it covers: scope, IP transfer, payment terms, revision limits.",
          assigneeId: zachary.id,
          status: "pending",
          order: 5,
          dueDate: d(1),
        },
        {
          id: "phase-1-task-6",
          title: "Build warm prospect list — 20 plumbers/trade businesses",
          description:
            "Personal network first. Google 'plumber [your city]' and note anyone with a bad site. LinkedIn is also good. Enter them all as prospects in this CRM.",
          assigneeId: zachary.id,
          status: "pending",
          order: 6,
          dueDate: d(2),
        },
        {
          id: "phase-1-task-7",
          title: "Send first 10 personalized outreach messages",
          description:
            "Use the Cold Email — Plumbing template in Documents. Attach the mockup you built for their specific business. Send from your new business domain, not CRI email.",
          assigneeId: zachary.id,
          status: "pending",
          order: 7,
          dueDate: d(3),
        },
        {
          id: "phase-1-task-8",
          title: "Close first paying client",
          description:
            "Run discovery call (see Discovery Call Script in Documents). Send proposal same day. 50% deposit + signed contract to start.",
          assigneeId: zachary.id,
          status: "pending",
          order: 8,
          dueDate: d(5),
        },
      ],
    },
    {
      id: "phase-2",
      title: "Phase 2 — Cold Outreach (Manual Validation)",
      description:
        "Before automating anything, manually validate the cold email + mockup approach. Pick ONE city or region, build 25-30 custom mockups, track metrics. Prove the system before you build the machine.",
      order: 2,
      tasks: [
        {
          id: "phase-2-task-1",
          title: "Set up cold email sending domain + DNS",
          description:
            "Follow the Email Deliverability Setup doc. Register separate sending subdomain, configure SPF/DKIM/DMARC, start email warmup. DO NOT send cold emails before 4-week warmup.",
          assigneeId: james.id,
          status: "pending",
          order: 1,
          dueDate: d(4),
        },
        {
          id: "phase-2-task-2",
          title: "Pick target city/region and research 100 plumbers",
          description:
            "Google My Business + Yelp. Spreadsheet with: business name, owner name, email, website URL, website quality (1-5). Focus on businesses with quality score 1-2 — those are your best prospects.",
          assigneeId: zachary.id,
          status: "pending",
          order: 2,
          dueDate: d(5),
        },
        {
          id: "phase-2-task-3",
          title: "Build 25-30 manual mockups for cold prospects",
          description:
            "Screenshot their current site, identify 3 things to improve, build a quick mockup using the template. Quality matters — a mediocre mockup is worse than none. James owns this.",
          assigneeId: james.id,
          status: "pending",
          order: 3,
          dueDate: d(7),
        },
        {
          id: "phase-2-task-4",
          title: "Send first cold campaign (25-30 emails)",
          description:
            "Use the Cold Email — Plumbing template. Personalize: [Name], [Business Name], [City], [one specific observation about their current site]. Track: opens, replies, calls booked.",
          assigneeId: zachary.id,
          status: "pending",
          order: 4,
          dueDate: d(8),
        },
        {
          id: "phase-2-task-5",
          title: "Analyze results and refine messaging",
          description:
            "Target: >40% open rate, >5% reply rate, >2% call booked. If below, change subject line first. Then body. Document what works in the Email Templates doc.",
          assigneeId: zachary.id,
          status: "pending",
          order: 5,
          dueDate: d(10),
        },
        {
          id: "phase-2-task-6",
          title: "Close 2 more clients from cold outreach",
          description:
            "Same process as Phase 1 close. By this point, use Phase 1 client as a reference / case study on the call.",
          assigneeId: zachary.id,
          status: "pending",
          order: 6,
          dueDate: d(10),
        },
      ],
    },
    {
      id: "phase-3",
      title: "Phase 3 — Build the Automation Pipeline",
      description:
        "Now automate the validated system: scraper → AI mockup generator → cold email → CRM intake. James leads the build; Zachary configures targeting and messaging. Goal: 50-100 new prospects/week with minimal manual effort.",
      order: 3,
      tasks: [
        {
          id: "phase-3-task-1",
          title: "Build web scraper for plumbing businesses",
          description:
            "Use n8n + Apify or Outscraper. Input: city/state + 'plumber'. Output: business name, owner name, email, website URL, Google review count. Store raw data to CSV or directly to staging DB.",
          assigneeId: james.id,
          status: "pending",
          order: 1,
          dueDate: d(12),
        },
        {
          id: "phase-3-task-2",
          title: "Build AI mockup generator",
          description:
            "Process: (1) Screenshot current site via API, (2) GPT-4 Vision analyzes brand colors + layout issues, (3) Fill pre-built plumbing site template with their info + colors, (4) Screenshot output = mockup. Store as PNG.",
          assigneeId: james.id,
          status: "pending",
          order: 2,
          dueDate: d(13),
        },
        {
          id: "phase-3-task-3",
          title: "Wire scraper → mockup → email → CRM intake in n8n",
          description:
            "Full pipeline: Scraper output → mockup generator → personalized email send (Instantly or SMTP) → POST to /api/intake/prospect with mockupBase64. Each step logs to n8n execution history for debugging.",
          assigneeId: james.id,
          status: "pending",
          order: 3,
          dueDate: d(14),
        },
        {
          id: "phase-3-task-4",
          title: "Set up automated follow-up sequences",
          description:
            "Day 0: initial email with mockup. Day 4: follow-up #1 (short, reference the mockup). Day 9: follow-up #2 (social proof / ROI angle). Day 16: last touch (easy opt-out). Use Instantly or Lemlist sequences.",
          assigneeId: zachary.id,
          status: "pending",
          order: 4,
          dueDate: d(14),
        },
        {
          id: "phase-3-task-5",
          title: "Test pipeline end-to-end with 10 real prospects",
          description:
            "Run 10 prospects through the full automated pipeline. Verify: mockup quality, email deliverability, CRM intake, follow-up timing. Fix any issues before scaling.",
          assigneeId: james.id,
          status: "pending",
          order: 5,
          dueDate: d(15),
        },
        {
          id: "phase-3-task-6",
          title: "Scale to 50-100 new prospects/week",
          description:
            "Expand scraper to new cities. Monitor reply rates weekly. Target: 50-100 prospects/week → 5-10 replies → 2-3 calls → 1 close. Adjust messaging based on what's working.",
          assigneeId: zachary.id,
          status: "pending",
          order: 6,
          dueDate: d(16),
        },
      ],
    },
    {
      id: "phase-4",
      title: "Phase 4 — Referral Engine + Inbound",
      description:
        "Turn happy clients into referral machines. Layer in LinkedIn content and inbound SEO once you have 3+ case studies. By this point, the business runs mostly on automation + referrals.",
      order: 4,
      tasks: [
        {
          id: "phase-4-task-1",
          title: "Deliver first 3 projects with documented results",
          description:
            "Before/after screenshots, load time improvement, call volume increase (ask client after 30 days). Everything measurable. These become your case studies.",
          assigneeId: james.id,
          status: "pending",
          order: 1,
          dueDate: d(20),
        },
        {
          id: "phase-4-task-2",
          title: "Build case study for each completed project",
          description:
            "Format: Problem (their old site sucked at X) → Solution (what we built) → Result (specific metric). One paragraph. Add to portfolio site. Use in cold email as social proof.",
          assigneeId: zachary.id,
          status: "pending",
          order: 2,
          dueDate: d(22),
        },
        {
          id: "phase-4-task-3",
          title: "Ask every client for 2 referral introductions",
          description:
            "Not 'do you know anyone?' — 'Who are the 2 other trade business owners you respect most in [city]? I'd love a warm intro.' Do this at project delivery, not before.",
          assigneeId: zachary.id,
          status: "pending",
          order: 3,
          dueDate: d(22),
        },
        {
          id: "phase-4-task-4",
          title: "Launch LinkedIn content — 2 posts/week each",
          description:
            "Zachary: business/ops angle (sales lessons, client results, local business tips). James: technical angle (site speed, mobile design, before/after). Consistency beats perfection.",
          assigneeId: zachary.id,
          status: "pending",
          order: 4,
          dueDate: d(18),
        },
        {
          id: "phase-4-task-5",
          title: "Set up Google Business Profile + collect reviews",
          description:
            "Free. Optimized GBP + 5+ reviews makes you findable when plumbers search 'web designer near me'. Ask first 3 clients for a review the week after launch.",
          assigneeId: james.id,
          status: "pending",
          order: 5,
          dueDate: d(20),
        },
      ],
    },
  ];

  for (const phaseData of phases) {
    const { tasks, ...phaseFields } = phaseData;
    await prisma.phase.upsert({
      where: { id: phaseFields.id },
      update: {
        title: phaseFields.title,
        description: phaseFields.description,
        order: phaseFields.order,
      },
      create: { ...phaseFields },
    });

    for (const taskData of tasks) {
      const { id: taskId, ...taskFields } = taskData;
      await prisma.task.upsert({
        where: { id: taskId },
        update: { title: taskFields.title, description: taskFields.description },
        create: {
          id: taskId,
          phaseId: phaseFields.id,
          ...taskFields,
        },
      });
    }

    console.log(
      `✓ Phase ${phaseFields.order}: "${phaseFields.title}" (${tasks.length} tasks)`
    );
  }

  // ─── Documents ────────────────────────────────────────────────────────
  const documents = [
    {
      id: "doc-pricing",
      title: "Pricing Guide",
      category: "pricing",
      content: `PRICING GUIDE — WEB DEV SERVICES
For Plumbing & Trade Businesses
Last updated: March 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STARTER — $1,500
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best for: Solo plumbers, 1-truck operations

Deliverables:
• 5-page website (Home, Services, About, Service Area, Contact)
• Mobile-responsive design
• Contact form with email notification
• Google Maps embed
• Basic on-page SEO (title tags, meta descriptions, H1s)
• 2 rounds of revisions
• Delivered in 2 weeks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROFESSIONAL — $3,000  ← RECOMMEND THIS FOR MOST LEADS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best for: Growing companies, 2-5 trucks, want more inbound calls

Deliverables:
• Everything in Starter
• Emergency / same-day callout landing page
• Quote request form with auto-responder
• Google My Business optimization
• Photo gallery / before & after section
• Customer review widget (Google Reviews integration)
• Booking tool integration (Calendly or Jobber)
• 3 rounds of revisions
• Delivered in 3 weeks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREMIUM — $5,000+
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best for: Established companies wanting to dominate their local market

Deliverables:
• Everything in Professional
• Online booking / scheduling system
• Multiple service landing pages (drain cleaning, water heaters, emergencies, etc.)
• Google Ads-ready landing page
• Job application / hiring page
• Live chat widget
• Core Web Vitals optimization (targeting 90+ PageSpeed score)
• 4 rounds of revisions
• Delivered in 4-5 weeks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAINTENANCE RETAINER — $200/month
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Included:
• Hosting + SSL certificate
• Security updates and backups
• Up to 2 content edits/month (copy changes, new photos, hours update)
• Monthly performance report (traffic, leads, speed score)
• Priority support (48-hour response)

Required after: Professional and Premium packages
Optional for: Starter

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT TERMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 50% deposit required to begin work
• 50% due on delivery (before DNS transfer)
• Retainer: monthly billing, cancel anytime with 30 days notice
• Late payment: work pauses after 7 days past due

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SALES NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Most plumbers need Professional. Lead with that, not Starter.
• Always quote the maintenance retainer — it's our recurring revenue.
• ROI framing: "1 extra job/month from the new site pays for it in month 2."
• If they push back on price: "We build sites that generate calls, not just look nice."
• Fiverr/cheap sites objection: "Those sites don't rank. Ours do."
• Always send a 2-option proposal (Professional + Premium) — anchors them on the higher option.`,
    },
    {
      id: "doc-service-agreement",
      title: "Service Agreement Template",
      category: "contracts",
      content: `WEB DESIGN & DEVELOPMENT SERVICE AGREEMENT

This agreement is between [YOUR BUSINESS NAME] ("Service Provider") and [CLIENT BUSINESS NAME] ("Client").

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SCOPE OF WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service Provider agrees to design and develop a website as described in the attached proposal/quote. The scope includes:

[FILL IN BASED ON PACKAGE]
□ Number of pages: ___
□ Features: ___
□ Number of revision rounds: ___
□ Estimated delivery date: ___

Any work outside this scope requires a separate written change order and may affect timeline and cost.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PAYMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total project fee: $___

Payment schedule:
• 50% deposit ($___) — due before work begins
• 50% final payment ($___) — due on delivery, before DNS transfer

Late payments: Work pauses after 7 days past due date. Project restarts when payment is received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. CLIENT RESPONSIBILITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Client agrees to:
• Provide all required content (text, photos, logo) within 5 business days of kickoff
• Respond to review requests within 3 business days
• Designate one point of contact for approvals

Delays caused by late client content may extend the project timeline.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. REVISIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This agreement includes [__] rounds of revisions. A "revision" means changes to existing content or design within the original scope. New features or pages are change orders.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. INTELLECTUAL PROPERTY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Upon receipt of final payment, Client owns all design files, code, and content created for this project. Service Provider retains the right to display the completed work in its portfolio.

Client represents that any content they provide (photos, text, logos) is owned by them or licensed for this use.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. CONFIDENTIALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Both parties agree to keep confidential any proprietary business information shared during this engagement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. LIMITATION OF LIABILITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service Provider is not liable for: loss of business, lost revenue, or damages arising from the use or inability to use the website. Total liability is limited to the amount paid under this agreement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. TERMINATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Either party may terminate with 7 days written notice. If Client terminates after work has begun, deposit is non-refundable. Service Provider will invoice for work completed to date.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIGNATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service Provider: _____________________________ Date: _______
[YOUR NAME], [YOUR BUSINESS NAME]

Client: _____________________________ Date: _______
[CLIENT NAME], [CLIENT BUSINESS NAME]

NOTE: This is a starting template. For projects over $5,000, consider having an attorney review.`,
    },
    {
      id: "doc-cold-email-plumbing",
      title: "Cold Email — Plumbing (Initial)",
      category: "templates",
      content: `COLD EMAIL TEMPLATE — PLUMBING BUSINESSES
Initial outreach (attach AI mockup as image)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT LINE OPTIONS (A/B test these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Option A: "I built a concept for [Business Name]'s website"
Option B: "[First Name] — quick question about your website"
Option C: "Your website vs. [Competitor Name]'s — I noticed something"

Best performer in similar campaigns: Option A. Test A vs. B first.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMAIL BODY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi [First Name],

I was searching for plumbers in [City] and came across [Business Name]. [One specific compliment — e.g. "Your Google reviews are seriously impressive — 4.9 stars across 80+ reviews."]

I noticed your website doesn't quite do justice to that reputation. So I spent a few hours building a concept for what it could look like. I attached it to this email.

What I'd build for you:
• Fast load on mobile (your current site takes [X] seconds — we target under 2)
• Clear "Call Now / Get a Quote" button people actually use
• A layout that helps you rank for "[City] plumber" and "[City] emergency plumber"

We build websites exclusively for trade businesses. A plumber we worked with in [nearby city] saw a 35% increase in inbound calls within 60 days.

Worth a 15-minute call to see if it makes sense for you? You can book directly at [calendly link] — no sales deck, just a straight conversation.

Either way, keep the mockup.

— Zachary
[Phone number]
[Business website]
[Business email — NOT CRI email]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSONALIZATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before sending, verify:
□ [First Name] is the owner's actual first name
□ [Business Name] is spelled correctly
□ [City] matches their service area
□ The specific compliment is real (check Google reviews / About page)
□ Load time stat is accurate (run their site through GTmetrix)
□ Mockup is attached and shows their business name
□ Your Calendly link is live
□ Sent from your business email, NOT corporaterecruitersinc.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Plain text format outperforms HTML for cold outreach
• Keep to under 150 words in the body
• The mockup does the heavy lifting — the email just has to get them to open it
• Never start with "I hope this email finds you well"`,
    },
    {
      id: "doc-followup-emails",
      title: "Follow-Up Email Sequence",
      category: "templates",
      content: `FOLLOW-UP EMAIL SEQUENCE — PLUMBING COLD OUTREACH

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLLOW-UP #1 — Day 4 after initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: RE: [same thread as initial email]

Hi [First Name],

Just wanted to make sure my email didn't get buried — you're probably getting 50 a day.

[One sentence referencing something specific about their business or site.]

Happy to jump on a quick call if the mockup sparked any interest. Booking link: [calendly]

— Zachary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLLOW-UP #2 — Day 9 after initial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: RE: [same thread]

Hi [First Name],

One more note before I stop bugging you —

A plumber we recently worked with in [City] was getting maybe 3-4 website leads/month from his old site. After we rebuilt it, he's at 12-15. For a trade business, that's 2-3 extra jobs/week.

Your current site has the same issues his did: slow on mobile, no clear CTA, not ranking for the right terms.

If the timing isn't right, no worries at all. But if you want to chat for 15 minutes, I'm at [calendly].

— Zachary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLLOW-UP #3 — Day 16 after initial (LAST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: RE: [same thread]

Hi [First Name],

Last email from me — I know your inbox is packed.

If a better website for [Business Name] is something you want to look at eventually, just reply "later" and I'll check back in a few months. No hard feelings.

If now works, here's my calendar: [calendly]

Either way, hope business is strong.

— Zachary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST-CALL PROPOSAL FOLLOW-UP (send same day as call)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: Proposal for [Business Name] — [date]

Hi [First Name],

Great talking with you earlier. Attached is the proposal we discussed.

Quick summary:
• [Package name] — $[price]
• Deliverables: [2-3 bullet points specific to what they said they needed]
• Timeline: [X] weeks from signed contract + deposit
• Deposit to start: $[50% amount]

To move forward, just reply with approval and I'll send over the contract and payment link.

Any questions at all, I'm at [phone] or just reply to this email.

— Zachary

NOTE: Send within 2 hours of the call. Reply rate drops significantly after 24 hours.`,
    },
    {
      id: "doc-discovery-call",
      title: "Discovery Call Script",
      category: "sales",
      content: `DISCOVERY CALL SCRIPT
Goal: Understand their situation, qualify the lead, and close with a proposal.
Duration: 20-30 minutes max. Prep time: 5 minutes to review their current site.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE THE CALL (5 min prep)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Open their current website
□ Note 3 specific problems (slow load, no mobile, no CTA, etc.)
□ Check their Google reviews — note the count and rating
□ Know which package you're likely to recommend before the call
□ Have your Calendly/proposal template ready to send immediately after

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPENING (2 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Hey [Name], thanks for making time. I'll keep this to 20 minutes — I know you're busy running a business. Quick agenda: I want to learn about what you're working with, show you what I had in mind, and if it makes sense, we can talk next steps. Sound good?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISCOVERY QUESTIONS (10 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
START HERE — let them talk:
"Tell me a bit about the business — how long have you been running it? How many trucks are you running?"

Get to the problem:
"How are you getting most of your customers right now?"
"What percentage would you say come from the website vs word of mouth vs other?"
"When someone lands on your site, what are you hoping they do?"

Uncover the pain:
"What bothers you most about your current site, or why haven't you had one built?"
"Have you ever lost a job you found out later went to a competitor with a better online presence?"

Qualify the value:
"If your website was bringing in 3-5 more calls a month, what would that be worth to you? [Let them answer.] So the site basically pays for itself in the first couple months."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESENT THE MOCKUP (5 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Okay, so based on everything you just told me — and from looking at your current site — here's what I had in mind for you." [Screen share or reference the mockup in the email]

Walk through 3 things:
1. What we fixed (specific to their pain points)
2. What it will do for their business (calls, leads, ranking)
3. How fast we can deliver

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLOSE (5 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Based on what you told me, I'd put you in the Professional package — that's $3,000. It gets you [specific things they said they needed]. We'd be live in 3 weeks."

If they want time: "Totally fair. What specifically are you thinking through? I can usually answer those questions right now."

If they say yes: "Great. I'll send the proposal and contract over today. It's one page. Once I get the signed contract and 50% deposit, we start immediately. You'll have a live site in 3 weeks."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMON OBJECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"I need to think about it."
→ "Of course. What specifically are you weighing? Cost? Timing? I want to make sure I address whatever's in the way."

"That's more than I expected."
→ "I get it. Let me put it this way: if you close 1 extra job from the new site every month, it pays for itself in 2 months. After that, every call from the website is pure margin."

"My cousin/friend does websites, maybe I'll have them do it."
→ "That's a reasonable option. The question is whether they've done it for trade businesses before — there's a specific SEO approach that works for local service companies. Happy to chat about what to look for."

"I already have someone working on it."
→ "Good to know. If anything changes or you want a second opinion, I'm here."

"I don't think my customers find me online."
→ "Let me show you something — [share screen, Google their business in a new browser]. Every month, [X] people search 'plumber [their city]'. Your competitors are getting those calls."`,
    },
    {
      id: "doc-onboarding-checklist",
      title: "New Client Onboarding Checklist",
      category: "delivery",
      content: `NEW CLIENT ONBOARDING CHECKLIST

Use this for every new project. Track in the client's prospect notes in the CRM.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE STARTING WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin:
□ Service agreement signed (use contract template in Documents)
□ 50% deposit received (add to Deal in CRM)
□ Project added to pipeline with expected close date

Assets to collect from client:
□ Logo file (vector .ai/.eps or high-res .png, transparent background preferred)
□ Brand colors (hex codes if they know them — otherwise we pull from logo)
□ 5-10 photos: team, trucks, jobs completed, before/after work
□ List of services offered (with descriptions if they have them)
□ Service area (cities/zip codes they cover)
□ 2-3 example websites they like (for style reference)
□ Any existing copy/text they want to keep
□ Testimonials (written or link to Google reviews)

Access to collect:
□ Domain registrar login (or we register a new domain for them)
□ Existing hosting login (if transferring)
□ Google My Business login (for optimization work)
□ Google Analytics / Search Console (if exists — optional)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEEK 1 — BUILD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Kickoff message sent (confirms timeline, what we need from them, next touchpoint)
□ Design mockup / wireframe created
□ Mockup shared with client for initial feedback
□ Client feedback received within 3 business days
□ Feedback incorporated into build

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEEK 2-3 — REFINEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Full build complete in staging environment (shareable link)
□ Mobile check (test on iPhone and Android)
□ Speed check (GTmetrix — target A grade / <3s load)
□ All forms tested (contact form, quote form)
□ All links working
□ Content proofread
□ Client revision rounds completed (up to contracted number)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Staging site approval received from client (written, email is fine)
□ Final 50% payment received
□ DNS pointed to new host
□ SSL certificate active (verify https:// with no warnings)
□ Site live — verify all pages load
□ Google Analytics connected
□ Google Search Console connected + sitemap submitted
□ Google My Business updated with new website URL
□ Deal marked as WON in CRM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST-DELIVERY (Weeks 2-4 after launch)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Week 1 after launch:
□ Check-in message: "Site live, how does it feel? Any quick fixes needed?"
□ Send handoff doc (basic instructions for content edits, who to contact)

Week 2 after launch:
□ Google review request sent ("Would mean a lot if you left us a Google review — takes 2 minutes")
□ Testimonial request for portfolio

Week 4 after launch:
□ Referral ask: "Who are the 2 other trade business owners you respect most in [city]? I'd love a warm intro."
□ Maintenance retainer offer (if not already on one)`,
    },
    {
      id: "doc-plumbing-research",
      title: "Plumbing Industry — Research & Talking Points",
      category: "reference",
      content: `PLUMBING INDUSTRY — RESEARCH & TALKING POINTS
Use these in sales conversations, email copy, and LinkedIn content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARKET FACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 500,000+ plumbing businesses in the US
• Average plumbing company revenue: $500k–$2M/year (BLS, 2024)
• Average job ticket: $200–$2,000 depending on complexity
• Top earning plumbers bill $100–$200/hour labor
• Industry grows ~3% annually — steady, recession-resistant
• ~60% of businesses are solo operators or 1-3 truck operations
• Plumber shortage nationwide = high demand, low price sensitivity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY THEIR WEBSITE MATTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 97% of consumers search online before calling a local service business (BrightLocal)
• "Plumber near me" gets 1M+ searches/month in the US
• "Emergency plumber [city]" has high commercial intent — people searching at 2am with a burst pipe are going to call the FIRST plumber they see
• Most plumbing sites score <50/100 on Google PageSpeed
• Average plumbing site is 5+ years old and not mobile-optimized
• A 1-second delay in load time reduces conversions by 7% (Akamai)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAIN POINTS TO REFERENCE IN OUTREACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "Your site loads in [X] seconds on mobile — most visitors leave before 3 seconds"
• "Your competitor [name] is ranking #1 for 'plumber [city]' — their site is newer"
• "You have 80 five-star reviews but your website doesn't show them — that social proof is sitting on the table"
• "Your current site has no 'Get a Quote' button that works — you're losing leads to voicemail"
• "Your site isn't https:// — Google penalizes that in rankings and Chrome shows 'Not Secure'"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROI FRAMING FOR SALES CALLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"If the new website gets you 3 extra calls a month and you close 1, that's $500–$1,500 revenue. At $3,000 for the site, you break even in 2–3 months. After that it's pure margin."

"Your site is your best salesperson — it works 24/7, doesn't call in sick, and closes jobs while you're sleeping."

"Your competitor spent $3,000 on their site 2 years ago. They're getting calls. You're getting fewer."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT PLUMBERS CARE ABOUT (in order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. More phone calls / leads
2. Looking professional (so customers trust them before they arrive)
3. Standing out from competitors
4. Easy to update (they don't want to call us every time they add a service)
5. Not costing a fortune

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THEY DON'T CARE ABOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Which CMS or framework you're using
• Your design philosophy or process
• How long you've been in business
• Technical details (hosting, SSL, CDN)
→ Keep sales conversations focused on OUTCOMES, not process

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEST OUTREACH TARGETS (prioritize these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 4.5+ star Google rating with 30+ reviews (good reputation, underserved by current site)
• Site loads >4 seconds on mobile (easy win to show them)
• Site is non-https or shows security warning
• No quote form or call tracking visible
• Site is clearly built before 2020
• Business has been operating 3+ years (established, has budget)`,
    },
    {
      id: "doc-email-deliverability",
      title: "Email Deliverability Setup Guide",
      category: "reference",
      content: `EMAIL DELIVERABILITY SETUP GUIDE
For cold outreach to plumbing businesses.
⚠️ READ THIS BEFORE SENDING A SINGLE COLD EMAIL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — REGISTER A DEDICATED DOMAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Register a NEW domain specifically for cold outreach. Never use:
• Your main business domain (trashes it if you get spam complaints)
• zachary@corporaterecruitersinc.com (confusing to plumbers + risks CRI reputation)

Good domain name patterns:
• get[yourbrand].com
• [yourbrand]sites.com
• tradewebstudio.com / tradewebdesign.com
• buildmytradeweb.com

Register at: Namecheap ($12/year) or Google Domains ($12/year)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SET UP GOOGLE WORKSPACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$6/month per user
Create: zachary@[yourdomain].com and james@[yourdomain].com
Use zachary@ for all cold outreach.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — CONFIGURE DNS RECORDS (REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In your domain registrar's DNS settings, add these records:

SPF (TXT record):
  Name: @
  Value: v=spf1 include:_spf.google.com ~all

DKIM:
  Go to Google Workspace Admin > Apps > Gmail > Authenticate email
  Follow the wizard — it generates the TXT record for you
  Add it to your DNS and verify

DMARC (TXT record):
  Name: _dmarc
  Value: v=DMARC1; p=quarantine; rua=mailto:zachary@[yourdomain].com

Verification: Use mail-tester.com or MXToolbox after setup.
Target score: 10/10 on mail-tester.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — EMAIL WARMUP (MANDATORY, 4 WEEKS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A new email account has no reputation. You MUST warm it up before sending cold emails.

DO NOT SKIP THIS — skipping warmup means your emails go to spam silently.

Warmup schedule:
  Week 1: 5-10 emails/day (use warmup tool)
  Week 2: 10-20 emails/day
  Week 3: 20-35 emails/day
  Week 4: 35-50 emails/day
  Week 5+: ready to send campaigns

Warmup tools (pick one):
  • Instantly.ai — built-in warmup, $37/month (RECOMMENDED — also handles campaigns)
  • Warmbox.ai — dedicated warmup, $19/month
  • Lemlist — warmup included in $59/month plan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — CHOOSE YOUR SENDING TOOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Option A: Instantly.ai ($37/month) — RECOMMENDED FOR MANUAL CAMPAIGNS
  • Built-in warmup + campaign management
  • Simple A/B testing
  • Good analytics (open rate, reply rate, bounce rate)
  • Import CSVs, set sequences, auto-rotate inboxes

Option B: n8n + SMTP — FOR AUTOMATION PIPELINE
  • Free (just your VPS running cost)
  • Required for wiring scraper → mockup → email → CRM
  • Use with Google Workspace SMTP (or SendGrid for reliability)
  • More setup but integrates natively with existing n8n

Recommendation: Use Instantly for Phase 2 (manual campaigns).
Switch to n8n SMTP for Phase 3 (automation pipeline), keeping Instantly for follow-ups.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOLUME LIMITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Never exceed 50 cold emails/day from a single Google Workspace account
• At scale: add more email accounts (each user = $6/month = separate inbox)
• Multiple domains: rotate sending across domains to stay under limits

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT RULES (avoid spam triggers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVOID in email body:
  • "FREE", "CLICK HERE", "LIMITED TIME", "NO OBLIGATION", "UNSUBSCRIBE"
  • ALL CAPS words
  • Excessive exclamation marks!!!
  • Image-only emails (no text)
  • Too many links (1 max in cold outreach)
  • HTML-heavy templates (plain text converts better)

DO:
  • Personalize at minimum: [Name], [Business Name], [City]
  • Plain text format
  • Keep first email under 150 words
  • Include a real unsubscribe option (Instantly handles this automatically)
  • Send one email at a time, not mass blasts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MONITORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Healthy metrics targets:
  • Open rate: >40% (if below 25%, fix subject line)
  • Reply rate: >5% (if below 3%, fix body or targeting)
  • Bounce rate: <5% (if above, clean your list)
  • Spam complaint rate: <0.1% (if above, stop immediately)

Check Google Postmaster Tools weekly for domain reputation.`,
    },
    {
      id: "doc-automation-architecture",
      title: "Automation Pipeline — Technical Architecture",
      category: "reference",
      content: `AUTOMATION PIPELINE ARCHITECTURE
Built by James. Reference for n8n build in Phase 3.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full pipeline:
  Scraper → Filter → Mockup Generator → Email Send → CRM Intake

Goal: 50-100 new prospects/week with minimal manual intervention.
Each step should be logged to n8n execution history for debugging.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — WEB SCRAPER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tool: n8n HTTP Request → Apify or Outscraper API
Input: city + "plumber" (or other trade)
Output per record:
  - businessName (string)
  - ownerName (string, best effort)
  - email (string)
  - phone (string)
  - website (string URL)
  - googleRating (float)
  - googleReviewCount (int)
  - address (string)
  - city (string)

Apify Actor: "Google Maps Scraper" (free tier: 100 results/run)
Outscraper: $0.001/record, cleaner email data

Filter: Skip if no email. Skip if googleRating < 3.5. Skip if website is blank.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — DEDUPLICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before generating mockup: check if email already exists in WBT CRM.
GET /api/prospects?email=[email] → if found, skip.
(Or use a local dedup spreadsheet if simpler for Phase 3 MVP)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — AI MOCKUP GENERATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Process:
  1. Screenshot current website via ScreenshotAPI or ScreenshotMachine
     → GET https://api.screenshotapi.net/screenshot?url=[website]&width=1280&height=720

  2. Send screenshot to GPT-4 Vision for analysis
     → Extract: brand colors (hex), primary services, tone (professional/casual)
     → Output JSON: { primaryColor, accentColor, services[], businessType }

  3. Fill pre-built HTML/CSS template with extracted data
     → Swap CSS variables for their colors
     → Insert business name, city, services into template content
     → Template: modern plumbing site design (James to build once, reuse forever)

  4. Screenshot the rendered HTML template
     → Use Puppeteer (headless Chrome) on the VPS, or another screenshot API
     → Output: PNG file

  5. Store PNG as base64 string for CRM intake

Template library needed: 1-2 plumbing site templates to start.
Quality target: mockup looks like a real site you'd actually build for them.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — PERSONALIZED EMAIL SEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tool: Instantly API or n8n Gmail node (OAuth)
Template: Cold Email — Plumbing (see Documents)

Personalization tokens populated:
  - {{firstName}} from ownerName
  - {{businessName}}
  - {{city}}
  - {{loadTime}} from GTmetrix/PageSpeed API (optional, adds credibility)
  - {{googleReviewCount}} + {{googleRating}} from scraper

Mockup: attach PNG or embed as inline image
Track: open, click, reply

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — CRM INTAKE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/intake/prospect (WBT CRM endpoint)
Headers: X-API-Key: [INTAKE_API_KEY from .env]
Body:
  {
    "name": "{{ownerName}}",
    "businessName": "{{businessName}}",
    "industry": "Plumbing",
    "email": "{{email}}",
    "phone": "{{phone}}",
    "website": "{{website}}",
    "outreachTemplate": "plumbing-cold-v1",
    "outreachSentAt": "[ISO timestamp]",
    "mockupBase64": "data:image/png;base64,..."
  }

Behavior (already built): deduplicates on email, stores mockup PNG in
public/uploads/mockups/, sets status = "email_sent", source = "scraped".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — AUTOMATED FOLLOW-UPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use Instantly sequence OR n8n scheduled trigger:
  Day 4: Follow-up #1 (see Follow-Up Email Sequence doc)
  Day 9: Follow-up #2
  Day 16: Final follow-up

On reply: sequence stops, prospect status updated to "replied" in CRM.
(Manual: update status in CRM. Automated: webhook from Instantly → PATCH /api/prospects/[id])

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MVP BUILD ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Build HTML template(s) for plumbing sites
2. Build mockup generator (screenshot → analyze → fill template → screenshot)
3. Test mockup generator with 5 real businesses manually
4. Build scraper integration
5. Wire full pipeline in n8n
6. Test end-to-end with 10 prospects
7. Scale`,
    },
    {
      id: "doc-business-overview",
      title: "Business Overview & Positioning",
      category: "reference",
      content: `BUSINESS OVERVIEW
[PLACEHOLDER — Fill in your business name, domain, and finalize positioning]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE BUSINESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business name: [YOUR BUSINESS NAME — TBD]
Domain: [YOUR DOMAIN — register as first step]
Business email: zachary@[domain], james@[domain]

Founders:
• Zachary Hanoosh — Business development, sales, client relationships, operations
• James — Technical lead, development, automation pipeline, delivery

Both: Technology implementation consultants with full-time jobs.
Available hours/week: ~10-15 hours combined for this business.
This is why automation is non-negotiable — we can't manually outreach at scale.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POSITIONING STATEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Draft:
"We build websites for plumbing and trade businesses that generate inbound calls —
not just look good. We show you a custom mockup of your new site before you spend a dime."

What makes us different:
1. We show the mockup before the pitch — no other web dev agency does this
2. We specialize in trade businesses (plumbers, HVAC, electricians) — not generic
3. We build for lead generation, not just aesthetics
4. Both founders are tech consultants — we build systems, not just sites
5. Fast turnaround (2-3 weeks vs. 2-3 months from agencies)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TARGET CUSTOMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary: Plumbers (initial focus)
Secondary: HVAC, electricians, general contractors
Eventually: Any trade/local service business

Ideal client profile (ICP):
• 1-10 trucks / employees
• In business 2+ years
• Has a Google Business Profile with real reviews
• Current website is old, slow, or doesn't exist
• Getting most customers by word of mouth (wants to diversify)
• Revenue: $200k–$2M/year (has budget)
• Owner-operated (owner makes buying decisions quickly)

NOT a good fit:
• Price shoppers looking for the cheapest option
• Multi-location national chains (need enterprise solution)
• Businesses that have already invested in a good modern site

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVENUE TARGETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Month 1-2: $3,000-6,000 (1-2 clients at $3k each)
Month 3-4: $9,000-15,000 (3-5 clients)
Month 6: $3,000+/month recurring (from maintenance retainers)
Year 1 goal: $30,000-50,000 total revenue

Monthly recurring (retainer) goal:
  10 clients × $200/month = $2,000 MRR by end of Year 1
  20 clients × $200/month = $4,000 MRR by end of Year 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTES FOR FUTURE UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Business name TBD — brainstorm and register ASAP (see Phase 1 tasks)
• Legal entity: consider LLC for liability protection before first client
• Business bank account: separate from personal, needed for invoicing
• Invoicing tool: Wave (free) or QuickBooks ($30/month) for invoices + payment links`,
    },
  ];

  for (const doc of documents) {
    const { id, ...fields } = doc;
    await prisma.document.upsert({
      where: { id },
      update: { title: fields.title, content: fields.content, category: fields.category },
      create: { id, ...fields },
    });
  }
  console.log(`✓ Documents: ${documents.length} seeded`);

  console.log("\n✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
