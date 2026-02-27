# 🇮🇳 India Deals Tracker

> A real-time intelligence dashboard tracking every major defence, trade, and strategic deal India has signed since 1947 — powered by AI-driven news scanning, human review, a built-in deals analyst, a full production-grade DevOps pipeline, and multi-cloud deployment.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)
![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange?style=flat-square)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?style=flat-square&logo=github-actions)
![Go](https://img.shields.io/badge/DevOps-Go%201.21-00ADD8?style=flat-square&logo=go)
![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC?style=flat-square&logo=terraform)
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
- Deploys to multiple clouds automatically — if Vercel goes down, Render backup spins up on its own

---

## ✨ Features

### 📊 Live Dashboard
- 164+ historical deals from 1947 to present
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
- **Seed Historical Data** — one-click button to load all historical deals

### 🧠 Deals Intelligence AI
- Floating chat panel on every page
- Knows delivery tracking for every major deal (e.g. "3 of 5 S-400 regiments delivered")
- Covers controversy and corruption angles (Rafale, Bofors, AgustaWestland)
- Gives both sides of every argument — not just government PR
- Powered by Groq Llama 3.3 70B — same free API key, no extra cost

### 🐕 Multi-Cloud Deployment
- Live on **Vercel** (primary) and **Render** (backup) simultaneously
- Both clouds share the same MongoDB — data always identical
- Go + Terraform tool deploys to any cloud in one command
- Auto-failover: if Vercel goes down, Render backup activates automatically

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | MongoDB Atlas (free tier) |
| AI Extraction & Chat | Groq API — Llama 3.3 70B Versatile |
| News Source | NewsAPI (free tier) |
| Primary Deployment | Vercel (auto-deploy on push) |
| Backup Deployment | Render (deployed via Go + Terraform) |
| CI/CD | GitHub Actions |
| Infrastructure as Code | Terraform |
| DevOps Tooling | Go 1.21 (7 custom tools) |
| Monitoring | UptimeRobot + Custom Go Monitor |
| Styling | Pure CSS with CSS variables |

**100% free to run.** No paid APIs required.

---

## 🔧 DevOps Architecture

This project runs on a full production-grade DevOps pipeline across two clouds.

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
┌──────────────────────────────────────┐
│   Multi-Cloud Deployment             │
│                                      │
│   Vercel (PRIMARY)                   │
│   Auto-deploys from main branch      │
│   indian-deal-tracker.vercel.app     │
│                                      │
│   Render (BACKUP)                    │
│   Deployed via Go + Terraform        │
│   india-deals-tracker.onrender.com   │
└──────────────┬───────────────────────┘
               ↓
┌─────────────────────────────┐
│   Go DevOps Suite (7 tools) │
│  • Health Monitor (60s)     │
│  • Metrics Collector        │
│  • Auto-failover Watchdog   │
│  • CLI deal management      │
│  • DB analytics             │
│  • Terraform infra manager  │
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
- TypeScript strict type checking (`tsc --noEmit`)
- ESLint code quality checks

**Job 2 — build:**
- Full Next.js production build
- Runs with all environment variables injected from GitHub Secrets

If either job fails → deployment blocked automatically. Broken code never reaches users.

---

### 2. 🚀 Multi-Cloud Deployment

**Primary — Vercel:**
Watches `main` branch. The moment GitHub Actions passes, Vercel builds and deploys automatically. Zero manual steps.

**Backup — Render:**
Deployed via our Go + Terraform watchdog tool. Same app, same MongoDB, different cloud. Deployed once and kept on standby.

```
Primary:  https://indian-deal-tracker.vercel.app
Backup:   https://india-deals-tracker.onrender.com
```

Both point to the **same MongoDB Atlas database** — data is always identical on both clouds.

---

### 3. 🐹 Go DevOps Suite (7 Tools)

A complete set of Go-powered DevOps tools in `devops-go/`:

| Tool | What it does |
|------|-------------|
| `monitor/` | Health check every 60s — better than UptimeRobot free tier |
| `notifier/` | Watches GitHub Actions — alerts on deploy success/failure |
| `dbstats/` | MongoDB analytics — countries, types, values, pending queue |
| `deals-cli/` | Manage deals from terminal — approve, reject, search, stats |
| `metrics/` | Records response time every 5 min — shows performance trends |
| `deals-infra/` | Go generates Terraform config → deploys entire Vercel setup in one command |
| `watchdog/` | Deploy to any cloud in one command + auto-failover |

**Quick examples:**
```bash
# Deploy to any cloud instantly
go run main.go deploy render
go run main.go deploy vercel
go run main.go deploy railway

# Manage deals without opening browser
go run main.go stats
go run main.go pending
go run main.go approve 65abc123def456

# Check all clouds at once
go run main.go status
```

See `devops-go/GOLANG-DEVOPS-MANIFESTO.md` for the full reference guide.

---

### 4. 🐕 Auto-Failover Watchdog

The watchdog runs permanently and monitors Vercel every 60 seconds. After 3 consecutive failures it automatically deploys a backup to Render via Terraform:

```
[21:00] ✅ Vercel UP | fast | 438ms | 164 deals
[21:03] ❌ Vercel DOWN | failure 1/3
[21:05] ❌ Vercel DOWN | failure 3/3

🚨 VERCEL IS DOWN! Deploying backup to Render via Terraform...
✅ BACKUP LIVE: https://india-deals-tracker.onrender.com

[21:35] ✅ Vercel recovered! Removing Render backup...
✅ Back to normal. Vercel is primary.
```

```bash
cd devops-go/watchdog
go run main.go watchdog
```

---

### 5. ⏰ Scheduled Automation — Vercel Cron

**File:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/fetch-deals",
    "schedule": "0 9 * * *"
  }]
}
```

Every day at **9:00 AM UTC**, Vercel automatically hits the cron endpoint which scans NewsAPI, processes articles with Groq AI, and saves new deals to the review queue. You wake up with new deals ready for review.

---

### 6. 🏥 Health Check Endpoint

`GET /api/health` returns:
```json
{
  "status": "healthy",
  "approvedDeals": 164,
  "timestamp": "2026-02-27T00:00:00.000Z"
}
```

Used by UptimeRobot, the Go health monitor, and the watchdog to confirm both the app and database are responding.

---

### 7. 🔒 Branch Protection

GitHub → Settings → Branches → `main`:
- ✅ Require `lint-and-typecheck` to pass
- ✅ Require `build` to pass
- ❌ Direct pushes to main are blocked

---

### DevOps Summary Table

| Component | Tool | Purpose | Cost |
|-----------|------|---------|------|
| CI Pipeline | GitHub Actions | Test + validate every push | Free |
| Primary Deploy | Vercel | Auto-deploy on push | Free |
| Backup Deploy | Render | Multi-cloud redundancy | Free |
| Infrastructure | Go + Terraform | One-command cloud deployment | Free |
| Scheduling | Vercel Cron | Daily news scan at 9AM UTC | Free |
| Monitoring | UptimeRobot | Ping health every 5 mins | Free |
| Go Monitor | Custom Go tool | Health check every 60s | Free |
| Failover | Go Watchdog | Auto-deploy backup on failure | Free |
| Branch Protection | GitHub | Block broken code | Free |



🐋 India Deals Tracker — DevOps Docker Suite
This document covers the containerization and orchestration of the India Deals Tracker Go toolset. By moving to Docker, we ensure 24/7 reliability, automated restarts, and centralized management.

🏗️ Architecture Overview
The suite is organized into a microservices-style architecture, where each Go tool runs in its own isolated environment.

Multi-Stage Builds: Uses a golang:1.21-alpine builder and a microscopic alpine:latest runner to keep image sizes < 20MB.

Orchestration: Managed via Docker Compose for one-command deployment.

Persistence: Local CSV logs are preserved via Docker Volumes.

🚀 Quick Start
1. Prerequisites
Docker Desktop installed and running.

A .env file in the devops-go/ directory containing your GITHUB_TOKEN and HEALTH_URL.

2. Launch the Fleet
Run the following command in the devops-go/ folder:
docker-compose up -d --build

This command builds the images, creates the private network, and starts the following services in the background:

1. deals-monitor: Health tracking service.

2. deals-notifier: GitHub deployment watcher.

3. deals-metrics: 5-minute performance collector.

4. deals-visualizer: Portainer management dashboard.


🖥️ Management Dashboard (Portainer)
Instead of using the terminal, manage your tools via the web UI:

URL: http://localhost:9001

Username: admin

Key Features:

Live Logs: View real-time output for any Go tool.

Stats: Monitor CPU and RAM usage (typically < 10MB per tool).

One-Click Restart: Re-run services if you update your MongoDB or GitHub settings.


🛠️ DevOps Maintenance Commands
Action,Command
Check service health,docker-compose ps
View unified logs,docker-compose logs -f --tail 20
Stop all services,docker-compose down
Inspect metrics file,cat ./metrics/metrics.csv


**Total DevOps cost: $0/month.**

---

## 📁 Project Structure

```
india-deals-tracker/
│
├── .github/workflows/ci.yml            # GitHub Actions CI/CD
│
├── devops-go/                          # Go DevOps Suite (7 tools)
│   ├── monitor/                        # Health monitor
│   ├── notifier/                       # GitHub deploy watcher
│   ├── dbstats/                        # MongoDB analytics
│   ├── deals-cli/                      # CLI deal management
│   ├── metrics/                        # Performance metrics
│   ├── deals-infra/                    # Terraform infrastructure manager
│   ├── watchdog/                       # Multi-cloud deploy + auto-failover
│   └── GOLANG-DEVOPS-MANIFESTO.md     # Complete DevOps reference (7 tools)
│
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── layout.tsx                  # Root layout + AI chat
│   │   ├── globals.css                 # All styles
│   │   ├── admin/page.tsx              # Admin panel
│   │   └── api/
│   │       ├── deals/route.ts          # CRUD for deals
│   │       ├── health/route.ts         # Health check endpoint
│   │       ├── ai-chat/route.ts        # AI analyst
│   │       ├── extract-deal/route.ts   # URL/text → deal
│   │       ├── admin/review/route.ts   # Approve / reject
│   │       └── cron/fetch-deals/       # Daily auto-scan
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── StatCard.tsx
│   │   ├── DealCard.tsx
│   │   ├── DealsList.tsx
│   │   ├── AdminPanel.tsx
│   │   └── DealsAI.tsx                 # Floating AI chat
│   │
│   └── lib/
│       ├── mongodb.ts
│       ├── dealExtractor.ts            # Groq AI extraction
│       └── seed.ts                     # 164 historical deals
│
├── vercel.json                         # Cron schedule
├── .env.local                          # Local env vars
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

Create `.env.local`:

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
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free |
| `CRON_SECRET` | Any random string | — |

### 3. Run Locally

```bash
npm run dev
# → http://localhost:3000        (dashboard)
# → http://localhost:3000/admin  (admin panel)
```

### 4. Seed Historical Data

Go to **Admin Panel → Auto-Scan tab → "Seed Historical Deals"** button.

---

## 🌐 Deploying

### Primary — Vercel
```bash
git push origin main   # GitHub Actions runs → Vercel auto-deploys
```

### Backup — Render (via Go + Terraform)
```bash
brew install terraform

export RENDER_API_TOKEN="rnd_..."
export RENDER_OWNER_ID="tea-..."   # from: curl -H "Authorization: Bearer <token>" https://api.render.com/v1/owners?limit=1

cd devops-go/watchdog
go run main.go deploy render
# ✅ Live at https://india-deals-tracker.onrender.com
```

### Any Other Cloud
```bash
go run main.go deploy railway
go run main.go deploy vercel
```

---

## 🔄 How the Auto-Scan Works

```
Daily at 9:00 AM UTC
        ↓
NewsAPI: 4 India-specific queries
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
Admin → Review Queue → Approve / Reject
```

---

## 🧠 AI Analyst Capabilities

The AI chat knows delivery tracking for every major deal:
- Rafale 36-jet: 36/36 ✅ delivered Dec 2022
- S-400: 3/5 regiments delivered (2 delayed by Ukraine war)
- MQ-9B Predator: 0/31 — deal still being finalised

And full controversy coverage:
- Rafale pricing controversy — Congress allegations vs CAG vindication
- AgustaWestland corruption — proven, deal cancelled
- Bofors scandal — led to 30-year artillery freeze

---

## 📊 Data Model

```typescript
interface Deal {
  title: string;
  country: string;
  value: string;           // Billions USD e.g. "8.7"
  status: 'Proposed' | 'Signed' | 'In Progress' | 'Ongoing' | 'Completed';
  type: 'Defense Acquisition' | 'Trade' | 'Technology' | 'Energy' | 'Diplomatic';
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  description: string;
  strategicIntent: string;
  whyIndiaNeedsThis: string;
  keyItems: string[];
  date: string;
  reviewStatus: 'approved' | 'pending' | 'rejected';
  sourceUrl?: string;
  createdAt: Date;
}
```

---

## 🗺️ Roadmap

- [ ] Telegram alerts when Vercel goes down (via watchdog)
- [ ] Sentry error tracking integration
- [ ] Rate limiting on API routes (Upstash Redis)
- [ ] Historical value charts by country over time
- [ ] Export to PDF / CSV
- [ ] Twitter/X bot that posts newly approved deals
- [ ] MongoDB Atlas Vector Search for smarter AI context
- [ ] Deploy Go monitor 24/7 on Render (runs even when Mac is off)
- [ ] Preview deployments on dev branch before merging to main

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) — blazing fast free LLM inference
- [NewsAPI](https://newsapi.org) — news aggregation
- [MongoDB Atlas](https://mongodb.com/atlas) — free cloud database
- [Vercel](https://vercel.com) — hosting + cron jobs
- [Render](https://render.com) — backup cloud hosting
- [GitHub Actions](https://github.com/features/actions) — free CI/CD
- [UptimeRobot](https://uptimerobot.com) — free uptime monitoring
- [Terraform](https://terraform.io) — infrastructure as code
- Every journalist who covered these deals 📰

---

## 📄 License

MIT — do whatever you want with it.

---

<p align="center">
  Built with ❤️ for India's strategic future 🇮🇳
  <br/>
  <strong>164 deals tracked · $2,008B total value · 35 partner nations</strong>
  <br/>
  <strong>2 clouds · 7 Go tools · $0/month</strong>
</p>