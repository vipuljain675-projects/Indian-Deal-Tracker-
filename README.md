# 🇮🇳 India Deals Tracker

> A real-time intelligence dashboard tracking every major defence, trade, and strategic deal India has signed since 1947 — powered by AI-driven news scanning, human review, a built-in deals analyst, and a full production-grade DevOps pipeline.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)
![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange?style=flat-square)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?style=flat-square&logo=github-actions)
![Uptime](https://img.shields.io/badge/Monitoring-UptimeRobot-red?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 🚀 What Is This?

India signs billions of dollars worth of defence, trade, and diplomatic deals every year — scattered across news sites, press releases, and government announcements. This project aggregates them all into one clean, searchable, and AI-enriched dashboard.

**The system automatically:**
- Scans news daily using NewsAPI
- Reads each article using Groq AI (Llama 3.3 70B)
- Extracts structured deal data — title, country, value, type, strategic intent
- Queues deals for human review before going live
- Lets you ask questions to an AI analyst with delivery tracking and controversy knowledge

---

## ✨ Features

### 📊 Live Dashboard
- 155+ historical deals from 1947 to present
- Real-time stats: total deals, defence count, total value, partner nations
- Filter by type, status, country, and impact level
- Deals sorted latest-first by year (2026 at top, 1947 at bottom)
- Sidebar with deal type breakdown and top partner rankings

### 🤖 AI Auto-Scanner
- Runs daily at 9AM UTC via Vercel Cron
- Queries NewsAPI with 4 India-specific search terms
- Each article processed by Groq AI to extract structured deal data
- Deals land in a **Review Queue** — nothing goes live without your approval

### 🔗 Manual URL / Text Extraction
- Paste any news article URL → AI extracts the deal in seconds
- If site is paywalled, switch to **Paste Text** mode
- Works with NDTV, Times of India, Economic Times, Reuters, Business Standard

### 👨‍💼 Admin Panel
- **Review Queue** — approve or reject AI-fetched deals
- **Paste URL / Text** — extract deals from articles on demand
- **Auto-Scan** — trigger a manual news scan
- **Add Manually** — form to add any deal directly (goes live instantly)
- **Seed Historical Data** — one-click button to load all 155 historical deals

### 🧠 Deals Intelligence AI
- Floating chat panel on every page
- Knows delivery tracking for every major deal (e.g. "3 of 5 S-400 regiments delivered")
- Covers controversy and corruption angles (Rafale, Bofors, AgustaWestland)
- Gives both sides of every argument — not just government PR
- Powered by Groq Llama 3.3 70B — same free API key, no extra cost

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | MongoDB Atlas (free tier) |
| AI Extraction & Chat | Groq API — Llama 3.3 70B Versatile |
| News Source | NewsAPI (free tier) |
| Deployment | Vercel (auto-deploy on push) |
| CI/CD | GitHub Actions |
| Monitoring | UptimeRobot |
| Styling | Pure CSS with CSS variables |

**100% free to run.** No paid APIs required.

---

## 🔧 DevOps Architecture

This project runs on a full production-grade DevOps pipeline. Here's exactly what happens from code to live site — automatically.

### The Complete Flow

```
You write code locally
        ↓
git push origin main
        ↓
┌─────────────────────────────┐
│   GitHub Actions CI/CD      │
│  1. npm install             │
│  2. TypeScript type check   │
│  3. ESLint code quality     │
│  4. Next.js build           │
│  ✅ All pass → continue     │
│  ❌ Any fail → blocked      │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│   Vercel Auto-Deploy        │
│  Pulls new code from main   │
│  Builds and deploys in ~2m  │
│  Live at vercel.app/        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│   UptimeRobot Monitoring    │
│  Pings /api/health every 5m │
│  Emails you if site is down │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│   Vercel Cron (Daily 9AM)   │
│  Auto-scans news for deals  │
│  No human action needed     │
└─────────────────────────────┘
```

---

### 1. 🔄 CI/CD Pipeline — GitHub Actions

**File:** `.github/workflows/ci.yml`

Every `git push` to `main` triggers an automated pipeline with two jobs:

**Job 1 — lint-and-typecheck:**
```yaml
- TypeScript strict type checking (tsc --noEmit)
- ESLint code quality checks
```

**Job 2 — build:**
```yaml
- Full Next.js production build
- Runs with all environment variables injected from GitHub Secrets
```

If either job fails, the deployment is **blocked automatically**. Broken code can never reach your users.

```bash
# Secrets required in GitHub → Settings → Secrets:
MONGODB_URI
NEWS_API_KEY
GROQ_API_KEY
CRON_SECRET
```

---

### 2. 🚀 Automatic Deployment — Vercel

Vercel watches the `main` branch on GitHub. The moment GitHub Actions passes both jobs, Vercel:
1. Pulls the latest code
2. Builds the Next.js app
3. Deploys to production

**Zero manual steps.** You push code, the world sees it in ~2 minutes.

```bash
# Environment variables required in Vercel Dashboard:
# Settings → Environment Variables
MONGODB_URI
NEWS_API_KEY
GROQ_API_KEY
CRON_SECRET
NEXT_PUBLIC_CRON_SECRET   # Same value as CRON_SECRET — needed for admin panel
```

---

### 3. ⏰ Scheduled Automation — Vercel Cron

**File:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/fetch-deals",
    "schedule": "0 9 * * *"
  }]
}
```

Every day at **9:00 AM UTC**, Vercel automatically hits the cron endpoint which:
- Searches NewsAPI with 4 India deal queries
- Sends each article to Groq AI for extraction
- Saves new deals as `reviewStatus: "pending"`
- They appear in your Admin → Review Queue

**Completely automatic.** You wake up every morning with new deals waiting for review.

> Note: Vercel Hobby plan supports 1 cron job running once daily maximum.

---

### 4. 🏥 Health Check Endpoint

**File:** `src/app/api/health/route.ts`

A dedicated monitoring endpoint that:
- Connects to MongoDB
- Counts all approved deals
- Returns status JSON

```json
{
  "status": "healthy",
  "approvedDeals": 155,
  "timestamp": "2026-02-21T05:58:50.724Z"
}
```

This endpoint exists **purely for monitoring tools** to ping. If MongoDB is down, the connection fails and returns `status: unhealthy`.

---

### 5. 📡 Uptime Monitoring — UptimeRobot

UptimeRobot pings `https://your-site.vercel.app/api/health` **every 5 minutes, 24/7**.

- ✅ Returns 200 → site marked **Up**
- ❌ Returns anything else → site marked **Down** → email alert sent immediately

**Why this matters:** Without monitoring, you only discover your site is down when a user complains. UptimeRobot catches it within 5 minutes automatically.

Current stats on this project:
- Average response time: **28ms**
- Uptime: **99.7%+**

---

### 6. 🔒 Branch Protection

GitHub → Settings → Branches → `main` branch:

- ✅ Require status checks to pass before merging
- ✅ `lint-and-typecheck` job must pass
- ✅ `build` job must pass
- ❌ Direct pushes to main are blocked

Even you (the repo owner) cannot push broken code directly to production. Everything goes through CI first.

---

### 7. ♻️ Cache Control

**File:** `src/app/page.tsx` and `src/app/admin/page.tsx`

```typescript
export const dynamic = 'force-dynamic';
```

Both the dashboard and admin panel use `force-dynamic` to disable Next.js server-side caching. This ensures:
- Every page load fetches fresh data from MongoDB
- Newly approved deals appear immediately
- Admin review queue stays in sync

Without this, Vercel would cache the server-rendered HTML and users would see stale data for minutes or hours.

---

### DevOps Summary Table

| Component | Tool | Purpose | Cost |
|-----------|------|---------|------|
| CI Pipeline | GitHub Actions | Test + validate every push | Free |
| Deployment | Vercel | Auto-deploy on push | Free |
| Scheduling | Vercel Cron | Daily news scan at 9AM UTC | Free |
| Monitoring | UptimeRobot | Ping health every 5 mins | Free |
| Health Check | Custom API route | `/api/health` for monitors | Free |
| Branch Protection | GitHub | Block broken code | Free |
| Cache Control | Next.js directive | Always fresh data | Built-in |

**Total DevOps cost: $0/month.**

---

## 📁 Project Structure

```
india-deals-tracker/
│
├── .github/
│   └── workflows/
│       └── ci.yml                      # GitHub Actions CI/CD pipeline
│
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard (force-dynamic)
│   │   ├── layout.tsx                  # Root layout + AI chat
│   │   ├── globals.css                 # All styles
│   │   ├── admin/
│   │   │   └── page.tsx                # Admin panel (force-dynamic)
│   │   └── api/
│   │       ├── deals/
│   │       │   ├── route.ts            # CRUD for deals
│   │       │   ├── seed/route.ts       # Seed 155 historical deals
│   │       │   ├── migrate/route.ts    # Set reviewStatus on existing deals
│   │       │   └── fix-dates/route.ts  # Fix year-based sorting
│   │       ├── health/route.ts         # Health check for UptimeRobot
│   │       ├── ai-chat/route.ts        # AI analyst (delivery + controversy)
│   │       ├── extract-deal/route.ts   # URL/text → structured deal
│   │       ├── admin/review/route.ts   # Approve / reject pending deals
│   │       └── cron/fetch-deals/route.ts # Daily auto-scan (9AM UTC)
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── StatCard.tsx                # Dashboard metric cards
│   │   ├── DealCard.tsx                # Deal card with type-colored borders
│   │   ├── DealsList.tsx               # Filterable grid + side panel
│   │   ├── AdminPanel.tsx              # Full admin UI (4 tabs + seed button)
│   │   └── DealsAI.tsx                 # Floating AI chat panel
│   │
│   └── lib/
│       ├── mongodb.ts                  # DB connection
│       ├── dealExtractor.ts            # Groq AI extraction logic
│       └── seed.ts                     # 155 historical deals (1947–2026)
│
├── vercel.json                         # Cron schedule (daily 9AM UTC)
├── .env.local                          # Environment variables (local only)
└── README.md
```

---

## ⚡ Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/india-deals-tracker.git
cd india-deals-tracker
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` in the root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/finbank?retryWrites=true&w=majority
NEWS_API_KEY=your_newsapi_key_here
GROQ_API_KEY=gsk_your_groq_key_here
CRON_SECRET=any_random_string_you_choose
NEXT_PUBLIC_CRON_SECRET=same_value_as_cron_secret
```

| Variable | Where to Get | Cost |
|----------|-------------|------|
| `MONGODB_URI` | [mongodb.com/atlas](https://mongodb.com/atlas) | Free |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) | Free |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free (100K tokens/day) |
| `CRON_SECRET` | Any random string | — |
| `NEXT_PUBLIC_CRON_SECRET` | Same as CRON_SECRET | — |

### 3. Run Locally

```bash
npm run dev
# → http://localhost:3000        (dashboard)
# → http://localhost:3000/admin  (admin panel)
```

### 4. Seed Historical Data

Go to **Admin Panel → Auto-Scan tab → "Seed 155 Historical Deals"** button. Click once. Done.

---

## 🌐 Deploying to Vercel

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Add all 5 environment variables in **Settings → Environment Variables**
4. Deploy

### Step 3 — Set Up GitHub Actions Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions** → Add:

```
MONGODB_URI
NEWS_API_KEY
GROQ_API_KEY
CRON_SECRET
```

Now every `git push` runs the CI pipeline automatically.

### Step 4 — Set Up UptimeRobot

1. Create free account at [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor → HTTP(S)
3. URL: `https://your-site.vercel.app/api/health`
4. Interval: Every 5 minutes
5. Add your email for alerts

### Step 5 — Set Up Branch Protection

GitHub → Settings → Branches → Add rule:
- Branch: `main`
- ✅ Require status checks: `lint-and-typecheck`, `build`
- ✅ Require branches to be up to date

---

## 🔄 How the Auto-Scan Works

```
Daily at 9:00 AM UTC (Vercel Cron)
        ↓
NewsAPI: 4 India-specific queries
  • "India defence deal signed 2025"
  • "India trade agreement bilateral 2025"
  • "India strategic partnership signed"
  • "India arms deal fighter jet submarine"
        ↓
~8 articles fetched per run
        ↓
Each article → Groq AI extracts:
  title, country, value, status, type,
  impact, description, strategicIntent,
  whyIndiaNeedsThis, keyItems, date
        ↓
Saved as reviewStatus: "pending"
        ↓
Admin → Review Queue shows new deals
        ↓
Approve → live on dashboard instantly
Reject  → discarded permanently
```

---

## 🧠 AI Analyst Capabilities

The DealsAI chat knows:

**📊 Delivery Tracking:**
- Rafale 36-jet: 36/36 ✅ delivered Dec 2022
- S-400: 3/5 regiments delivered (2 delayed by Ukraine war)
- MQ-9B Predator: 0/31 — deal still being finalised
- GE F414 engines: 0/200 — HAL production line not started yet
- And more for every major deal

**⚖️ Controversy & Both Sides:**
- Rafale pricing controversy — Congress allegations vs CAG vindication
- AgustaWestland corruption — proven, deal cancelled
- Bofors scandal — led to 30-year artillery freeze
- FGFA/Su-57 walkout — all 5 reasons India exited in 2018
- F-35 kill switch — why India never pursued it

**🔍 Analyst Verdict:**
- Always gives both sides before a conclusion
- Cites CAG audits, court verdicts, official statements
- Never whitewashes problems

---

## 📊 Data Model

```typescript
interface Deal {
  title: string;
  country: string;
  value: string;           // Billions USD as string e.g. "8.7"
  status: 'Proposed' | 'Signed' | 'In Progress' | 'Ongoing' | 'Completed';
  type: 'Defense Acquisition' | 'Trade' | 'Technology' | 'Energy' | 'Diplomatic';
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  description: string;
  strategicIntent: string;
  whyIndiaNeedsThis: string;
  keyItems: string[];
  date: string;            // e.g. "September 2016" or "2023"

  // Workflow metadata
  reviewStatus: 'approved' | 'pending' | 'rejected';
  sourceUrl?: string;      // For AI-fetched deals
  sourceTitle?: string;
  fetchedAt?: Date;
  createdAt: Date;
}
```

---

## 🗺️ Roadmap

- [ ] Sentry error tracking integration
- [ ] Rate limiting on API routes (Upstash Redis)
- [ ] Email/Telegram alerts when high-impact deals detected
- [ ] Historical value charts (deal values over time by country)
- [ ] Export to PDF / CSV
- [ ] Twitter/X bot that posts newly approved deals
- [ ] Compare mode — side-by-side deal comparison
- [ ] MongoDB Atlas Vector Search for smarter AI context
- [ ] Preview deployments on dev branch before merging to main

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) — blazing fast free LLM inference
- [NewsAPI](https://newsapi.org) — news aggregation
- [MongoDB Atlas](https://mongodb.com/atlas) — free cloud database
- [Vercel](https://vercel.com) — hosting + cron jobs
- [GitHub Actions](https://github.com/features/actions) — free CI/CD
- [UptimeRobot](https://uptimerobot.com) — free uptime monitoring
- Every journalist who covered these deals 📰

---

## 📄 License

MIT — do whatever you want with it.

---

<p align="center">
  Built with ❤️ for India's strategic future 🇮🇳
  <br/>
  <strong>155 deals tracked · $2,465B total value · 34 partner nations</strong>
</p>
