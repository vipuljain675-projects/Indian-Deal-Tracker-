# 🇮🇳 India Deals Tracker

> A real-time intelligence dashboard tracking every major defence, trade, and strategic deal India has signed since 1947 — powered by AI-driven news scanning, human review, and a built-in deals analyst.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)
![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 🚀 What Is This?

India signs billions of dollars worth of defence, trade, and diplomatic deals every year — scattered across news sites, press releases, and government announcements. This project aggregates them all into one clean, searchable, and AI-enriched dashboard.

**The system automatically:**
- Scans news every 6 hours using NewsAPI
- Reads each article using Groq AI (Llama 3.3 70B)
- Extracts structured deal data — title, country, value, type, strategic intent
- Queues deals for human review before going live
- Lets you ask questions to an AI analyst trained on India's deal history

---

## ✨ Features

### 📊 Live Dashboard
- 69+ historical deals from 1947 to present, seeded on first run
- Real-time stats: total deals, defence count, total value, partner nations
- Filter by type, status, country, and impact level
- Click any deal for a full side panel with strategic analysis
- Sidebar with deal type breakdown and top partner rankings

### 🤖 AI Auto-Scanner
- Runs every 6 hours via Vercel Cron
- Queries NewsAPI with 4 India-specific search terms
- Each article is processed by Groq AI to extract structured deal data
- Deals land in a **Review Queue** — nothing goes live without your approval
- Rate-limited to stay comfortably within Groq's free tier (14,400 req/day)

### 🔗 Manual URL / Text Extraction
- Paste any news article URL → AI extracts the deal in seconds
- If site is paywalled, switch to **Paste Text** mode — paste the article content directly
- Works with NDTV, Times of India, Economic Times, Reuters, Business Standard

### 👨‍💼 Admin Panel
- **Review Queue** — approve or reject AI-fetched deals
- **Paste URL / Text** — extract deals from articles on demand  
- **Auto-Scan** — trigger a manual news scan or view cron schedule
- **Add Manually** — form to add any deal directly (goes live instantly)

### 🧠 Deals Intelligence AI
- Floating chat panel on every page
- Ask anything: *"What is the status of the Rafale deal?"*, *"Compare India-Russia vs India-USA ties"*
- Knows all major India deals, agencies (DRDO, HAL, BrahMos), historical context
- Powered by Groq — same free API key, no extra cost

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | MongoDB Atlas (free tier) |
| AI Extraction | Groq API — Llama 3.3 70B Versatile |
| News Source | NewsAPI (free tier, 100 req/day) |
| Deployment | Vercel (cron jobs included) |
| Styling | Pure CSS with CSS variables |

**100% free to run.** No paid APIs required.

---

## 📁 Project Structure

```
india-deals-tracker/
│
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── layout.tsx                  # Root layout + AI chat
│   │   ├── globals.css                 # All styles
│   │   ├── admin/
│   │   │   └── page.tsx                # Admin panel (server component)
│   │   └── api/
│   │       ├── deals/route.ts          # CRUD for deals
│   │       ├── ai-chat/route.ts        # AI analyst chat endpoint
│   │       ├── extract-deal/route.ts   # URL/text → AI extraction
│   │       ├── admin/review/route.ts   # Approve / reject pending deals
│   │       └── cron/fetch-deals/route.ts # Auto-scan (every 6h)
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── StatCard.tsx                # Dashboard metric cards
│   │   ├── DealCard.tsx                # Deal card with colored borders by type
│   │   ├── DealsList.tsx               # Filterable grid + side panel
│   │   ├── AdminPanel.tsx              # Full admin UI (4 tabs)
│   │   └── DealsAI.tsx                 # Floating AI chat panel
│   │
│   ├── lib/
│   │   ├── mongodb.ts                  # DB connection
│   │   └── dealExtractor.ts            # Groq AI extraction logic
│   │
│   ├── models/
│   │   └── Deal.ts                     # Mongoose schema
│   │
│   └── data/
│       └── seed.ts                     # 69 historical deals (1947–2026)
│
├── vercel.json                         # Cron schedule config
├── .env.local                          # Environment variables
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
```

| Variable | Where to Get | Cost |
|----------|-------------|------|
| `MONGODB_URI` | [mongodb.com/atlas](https://mongodb.com/atlas) | Free |
| `NEWS_API_KEY` | [newsapi.org](https://newsapi.org) | Free (100 req/day) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) | Free (14,400 req/day) |
| `CRON_SECRET` | Make up any string | — |

### 3. Seed Historical Data

Start the dev server, then run this once in your browser console at `localhost:3000`:

```javascript
// Seed 69 historical deals (1947–2026)
fetch('/api/deals', { method: 'POST', body: JSON.stringify({ action: 'seed' }) })

// Mark all existing deals as approved
fetch('/api/deals/migrate', { method: 'POST' }).then(r => r.json()).then(console.log)
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
# → http://localhost:3000/admin
```

---

## 🔄 How the Auto-Scan Works

```
Every 6 hours (Vercel Cron)
        ↓
NewsAPI: 4 India-specific queries
        ↓
~8 articles fetched per run
        ↓
Each article → Groq AI reads & extracts:
  title, country, value, status, type,
  impact, description, strategicIntent,
  whyIndiaNeedsThis, keyItems, date
        ↓
Saved as reviewStatus: "pending"
        ↓
You see it in Admin → Review Queue
        ↓
Approve → goes live on dashboard
Reject  → discarded
```

**Rate limiting:** 8 second delay between Groq API calls — stays well within the 15 req/min free tier limit.

---

## 🌐 Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add env variables in Vercel dashboard:
# Settings → Environment Variables → add all 4 from .env.local
```

The `vercel.json` cron config auto-activates on deployment:

```json
{
  "crons": [{
    "path": "/api/cron/fetch-deals",
    "schedule": "0 */6 * * *"
  }]
}
```

Scans run at **00:00, 06:00, 12:00, 18:00 UTC** daily. Completely automatic after deploy.

---

## 🤖 AI Deal Extraction

The `dealExtractor.ts` sends article text to Groq with a structured prompt and gets back:

```json
{
  "title": "India–France 114 Rafale MRFA Deal",
  "country": "France",
  "value": "40",
  "status": "Proposed",
  "type": "Defense Acquisition",
  "impact": "High Impact",
  "description": "India's cabinet approved a ₹3.25 lakh crore deal...",
  "strategicIntent": "Replace ageing MiG-21 and Jaguar fleets...",
  "whyIndiaNeedsThis": "India's air force is critically short of squadrons...",
  "keyItems": ["114 fighter jets", "Technology transfer to HAL", "Meteor BVR missiles"],
  "date": "February 2025"
}
```

If the article is not about an India deal, it returns `{"error": "not_a_deal"}` and gets silently skipped.

---

## 📊 Data Model

```typescript
interface Deal {
  title: string;
  country: string;
  value: string;           // Billions USD as string
  status: 'Proposed' | 'Signed' | 'In Progress' | 'Ongoing' | 'Completed';
  type: 'Defense Acquisition' | 'Trade' | 'Technology' | 'Energy' | 'Diplomatic';
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  description: string;
  strategicIntent: string;
  whyIndiaNeedsThis: string;
  keyItems: string[];
  date: string;
  
  // Auto-fetch metadata
  reviewStatus: 'approved' | 'pending' | 'rejected';
  sourceUrl?: string;
  sourceTitle?: string;
  fetchedAt?: Date;
  createdAt: Date;
}
```

---

## 🗺️ Roadmap

- [ ] Email/Telegram alerts when high-impact deals are detected
- [ ] Historical value charts (deal values over time by country)
- [ ] Export to PDF / CSV
- [ ] Twitter/X bot that posts newly approved deals
- [ ] Compare mode — side-by-side deal comparison
- [ ] Mobile app (React Native)

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) — blazing fast free LLM inference
- [NewsAPI](https://newsapi.org) — news aggregation
- [MongoDB Atlas](https://mongodb.com/atlas) — free cloud database
- [Vercel](https://vercel.com) — hosting + cron jobs
- Every journalist who covered these deals 📰

---

## 📄 License

MIT — do whatever you want with it. If you build something cool on top of this, tag me.

---

<p align="center">
  Built with ❤️ for India's strategic future 🇮🇳
</p>
