 # 🐹 Golang DevOps Manifesto
## India Deals Tracker — Complete DevOps Reference

> Everything you need to run, understand, and extend the 5 Go DevOps tools built for this project.

---

## 📁 Folder Structure

```
india-deals-tracker/
└── devops-go/
    ├── monitor/        ← Tool 1: Health Monitor
    ├── notifier/       ← Tool 2: Deployment Watcher
    ├── dbstats/        ← Tool 3: Database Stats
    ├── deals-cli/      ← Tool 4: CLI Tool
    └── metrics/        ← Tool 5: Metrics Collector
```

---

## ⚙️ One-Time Setup

Install Go (if not already installed):
```bash
brew install go
go version   # should show go1.21+
```

Set your environment variables (add to ~/.zshrc to make permanent):
```bash
export BASE_URL="https://indian-deal-tracker.vercel.app"
export CRON_SECRET="mySuperSecret123"
export MONGODB_URI="mongodb+srv://vipuljain675_db_user:...@cluster0.xpr7jsw.mongodb.net/finbank"
export HEALTH_URL="https://indian-deal-tracker.vercel.app/api/health"
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_REPO="vipuljain675-projects/Indian-Deal-Tracker-"
```

Make permanent (so you don't re-type every session):
```bash
nano ~/.zshrc
# paste the exports above at the bottom
# save with Ctrl+X → Y → Enter
source ~/.zshrc   # reload
```

---

---

## 🔍 Tool 1 — Health Monitor

**What it does:**
Checks your site every 60 seconds and tells you if it goes down.
Better than UptimeRobot free tier (5 min) — this checks every 1 minute.
Alerts you after 3 consecutive failures.

**Location:** `devops-go/monitor/`

**Run:**
```bash
cd devops-go/monitor
go run main.go
```

**With custom URL:**
```bash
HEALTH_URL=http://localhost:3000/api/health go run main.go
```

**What you'll see:**
```
🚀 India Deals Tracker Monitor
📡 Watching: https://indian-deal-tracker.vercel.app/api/health
⏱️  Interval: every 1m0s

[2026-02-26 16:44:39] ✅ UP  | 465ms | 161 deals | Uptime: 100.0%
[2026-02-26 16:45:39] ✅ UP  | 435ms | 161 deals | Uptime: 100.0%
[2026-02-26 16:46:40] ❌ DOWN | Error: connection timeout
[2026-02-26 16:47:40] ❌ DOWN | Error: connection timeout
[2026-02-26 16:48:40] ❌ DOWN | Error: connection timeout
🚨 ALERT: Site has been DOWN for 3 consecutive checks!
```

**What each column means:**
| Column | Meaning |
|--------|---------|
| Timestamp | Exact time of check |
| ✅ / ❌ | Site up or down |
| 465ms | How fast the server responded |
| 161 deals | Deals count from DB (confirms DB is connected) |
| Uptime % | % of checks that were UP |

**Stop it:** `Ctrl+C`

---

---

## 🚀 Tool 2 — Deployment Watcher

**What it does:**
Watches your GitHub Actions pipeline every 30 seconds.
When you `git push`, this tells you instantly when the deploy starts,
is running, succeeded, or failed — without opening GitHub.

**Location:** `devops-go/notifier/`

**Run:**
```bash
cd devops-go/notifier

export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_REPO="vipuljain675-projects/Indian-Deal-Tracker-"

go run main.go
```

**What you'll see after a git push:**
```
🚀 Deployment Watcher — India Deals Tracker
📦 Repo   : vipuljain675-projects/Indian-Deal-Tracker-
🔄 Polling every 30 seconds

[17:12:41] Current state:
  ✅ #12847  completed   success    [a3f9c12] main

🔔 NEW DEPLOYMENT DETECTED!
   Branch  : main
   Commit  : d4a1b9c
   Status  : in_progress

[17:13:11] ⏳ DEPLOYING... (commit d4a1b9c on main)
[17:13:41] ⏳ DEPLOYING... (commit d4a1b9c on main)
[17:14:11] ✅ DEPLOYED SUCCESSFULLY! commit d4a1b9c → live on Vercel 🎉
```

**Get a GitHub Token:**
1. github.com → profile photo → Settings
2. Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token → tick `repo` scope → Generate
4. Copy the `ghp_...` token immediately (shown only once!)

**Stop it:** `Ctrl+C`

---

---

## 📊 Tool 3 — Database Stats

**What it does:**
Connects directly to MongoDB Atlas and prints a full breakdown of your
deals — counts, countries, types, values, pending items.
Faster than opening the Atlas UI.

**Location:** `devops-go/dbstats/`

**First time only:**
```bash
cd devops-go/dbstats
go mod tidy   # installs MongoDB driver
```

**Run:**
```bash
cd devops-go/dbstats
MONGODB_URI="your_mongodb_uri" go run main.go
```

**What you'll see:**
```
╔══════════════════════════════════════════╗
║     🇮🇳 India Deals Tracker — DB Stats    ║
╚══════════════════════════════════════════╝

📊 OVERVIEW
   Total documents in DB : 164
   Approved deals        : 161
   Pending review        : 3       ← deals waiting for your approval
   Rejected              : 0
   Total estimated value : $2505.1B

🌍 TOP 10 PARTNER COUNTRIES
   USA                  ████████████████████████████████████ 37
   Russia               ████████████████████████ 25
   France               ████████████ 13
   Israel               ██████████ 11
   United Kingdom       ██████ 7

📦 DEAL TYPES
   Defense Acquisition        63 deals (39%)
   Trade                      34 deals (21%)
   Diplomatic                 30 deals (19%)
   Technology                 22 deals (14%)
   Energy                     12 deals (7%)

⚡ IMPACT LEVELS
   🔴 High Impact             95 deals
   🟡 Medium Impact           53 deals
   🟢 Low Impact              13 deals

⏰ Report generated: 2026-02-26 15:59:28
```

**When to use this:**
- Quick DB health check without opening MongoDB Atlas UI
- Checking how many deals are pending review
- Verifying the seed script added deals correctly

---

---

## 🖥️ Tool 4 — CLI Tool

**What it does:**
Manage your deals from the terminal without opening the browser.
Approve/reject deals, search, see stats — all in one command.

**Location:** `devops-go/deals-cli/`

**Setup:**
```bash
cd devops-go/deals-cli

export BASE_URL="https://indian-deal-tracker.vercel.app"
export CRON_SECRET="mySuperSecret123"
```

---

### All Commands

#### `stats` — Live database overview
```bash
go run main.go stats
```
```
🇮🇳 India Deals Tracker — Live Stats
─────────────────────────────────────────────
Server        ● HEALTHY
Approved      161 deals
Pending       3 deals waiting for your review
Total value   $2505.1B

Top Partners
  USA             ██████████████████ 37
  Russia          ████████████ 25
  France          ██████ 13

Deal Types
  Defense Acquisition        63 deals (39%)
  Trade                      34 deals (21%)
```

---

#### `pending` — See deals waiting for approval
```bash
go run main.go pending
```
```
📋 3 deals waiting for review:
──────────────────────────────────────────────────────────────────────

[1]  India-Japan Semiconductor Partnership
    ID      : 65abc123def456789012345a
    Country : Japan
    Value   : $2.5B
    Type    : Technology
    Impact  : 🔴 High
    Status  : Proposed
    Desc    : Joint semiconductor fabrication agreement...

    approve: go run main.go approve 65abc123def456789012345a
    reject:  go run main.go reject  65abc123def456789012345a
```

---

#### `approve` — Approve a pending deal
```bash
go run main.go approve 65abc123def456789012345a
```
```
Approving deal 65abc123def456789012345a...
✅ Deal approved! It's now live on the dashboard.
```

---

#### `reject` — Reject a pending deal
```bash
go run main.go reject 65abc123def456789012345a
```
```
🗑️  Deal rejected and removed from queue.
```

---

#### `search` — Search deals by keyword
```bash
go run main.go search rafale
```
```
🔍 3 deals matching "rafale":
─────────────────────────────────────────────────────────────────

  114 Rafale MRFA Deal (Multi-Role Fighter Aircraft)
  France · $40B · In Progress · 2025
  India's cabinet approved a massive ~$40B deal for 114 Rafale MRFA jets...

  India-France Rafale Deal
  France · $35B · Proposed · 2026
  India and France are discussing a potential $35 billion...

  India-France Rafale Fighter Jet Deal (36 Aircraft)
  France · $8.7B · Completed · 2016
  India purchased 36 Rafale multi-role combat aircraft...
```

Other search examples:
```bash
go run main.go search russia
go run main.go search submarine
go run main.go search missile
go run main.go search usa
go run main.go search trade
```

---

#### `top` — Top 10 deals by value
```bash
go run main.go top
```
```
💰 Top 10 Deals by Value
─────────────────────────────────────────────────────────────────

🥇 India–European Union Free Trade Agreement
   European Union · $500B · Signed

🥈 India–USA Bilateral Trade Agreement (Trump–Modi Deal)
   USA · $500B · In Progress

🥉 India–UK Free Trade Agreement Negotiations
   United Kingdom · $120B · In Progress

4️⃣  India–ASEAN FTA (Free Trade in Goods Agreement)
   ASEAN · $100B · Completed
```

---

#### `help` — Show all commands
```bash
go run main.go help
```

---

---

## 📈 Tool 5 — Metrics Collector

**What it does:**
Records your app's response time and deal count every 5 minutes
into a `metrics.csv` file. After collecting data you can see trends —
was your site slow on Tuesday? Did it get slower after a deploy?

**Location:** `devops-go/metrics/`

---

### Commands

#### `collect` — Start recording (runs forever)
```bash
cd devops-go/metrics
go run main.go collect
```
```
📊 Metrics Collector — India Deals Tracker
📡 Watching : https://indian-deal-tracker.vercel.app/api/health
💾 Saving to: metrics.csv
⏱️  Interval : every 5 minutes

[2026-02-26 18:10:17] ✅ UP | fast 655ms  | 161 deals | Check #1
[2026-02-26 18:28:38] ✅ UP | fast 521ms  | 161 deals | Check #2
[2026-02-26 18:33:39] ✅ UP | slow 1046ms | 161 deals | Check #3
[2026-02-26 19:41:25] ✅ UP | fast 629ms  | 164 deals | Check #8
```

Speed labels:
- `fast` = under 500ms ✅
- `slow` = 500ms–1500ms ⚠️
- `very slow` = over 3000ms 🚨

Stop it: `Ctrl+C`

---

#### `report` — Full analysis of all collected data
```bash
# Open a NEW terminal tab (keep collect running in the other)
cd devops-go/metrics
go run main.go report
```
```
📊 Metrics Report — India Deals Tracker
Based on 47 data points

📈 OVERALL PERFORMANCE
─────────────────────────────────────────────
  Uptime          100.00%
  Avg response    623ms
  Fastest         435ms
  Slowest         1046ms
  P95 response    980ms        ← worst case 95% of the time
  Total downtime  0 checks down
  Data collected  Feb 24 to Feb 26 19:41

🕐 RESPONSE TIME BY HOUR (avg)
─────────────────────────────────────────────
  09:00  ███████████ 550ms     ← morning fast
  14:00  ████████████████ 800ms ← afternoon slower
  22:00  ████████ 400ms        ← night fastest

📦 DEAL COUNT OVER TIME
─────────────────────────────────────────────
  Feb 24  161 deals
  Feb 25  161 deals
  Feb 26  164 deals            ← 3 new deals added!

🐢 SLOWEST RESPONSES (top 5)
─────────────────────────────────────────────
  1046ms  Feb 26 18:33  healthy
  954ms   Feb 26 18:48  healthy
```

---

#### `today` — Just today's data
```bash
cd devops-go/metrics
go run main.go today
```
```
📅 Today's Metrics — 2026-02-26
───────────────────────────────────────────────────────
  ✅ 18:10  655ms  161 deals
  ✅ 18:28  521ms  161 deals
  ✅ 18:33  1046ms 161 deals
  ✅ 18:38  520ms  161 deals
───────────────────────────────────────────────────────
  Checks: 8  |  Avg: 652ms  |  Uptime: 100.0%
```

---

---

## 🖥️ Run All 5 Tools Simultaneously

Open 5 terminal tabs in VSCode (`Ctrl+Shift+`` five times):

```bash
# Tab 1 — Health Monitor
cd devops-go/monitor && go run main.go

# Tab 2 — Deployment Watcher
cd devops-go/notifier
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPO="vipuljain675-projects/Indian-Deal-Tracker-"
go run main.go

# Tab 3 — DB Stats (run on demand, not forever)
cd devops-go/dbstats && MONGODB_URI="..." go run main.go

# Tab 4 — CLI Tool (run on demand)
cd devops-go/deals-cli && go run main.go stats

# Tab 5 — Metrics Collector
cd devops-go/metrics && go run main.go collect
```

---

## ⚡ Quick Reference Card

| Tool | Command | What it does |
|------|---------|-------------|
| Monitor | `cd monitor && go run main.go` | Watches site every 60s |
| Notifier | `cd notifier && go run main.go` | Watches GitHub deploys |
| DB Stats | `cd dbstats && go run main.go` | Prints DB breakdown |
| CLI stats | `go run main.go stats` | Live app overview |
| CLI pending | `go run main.go pending` | Deals to review |
| CLI approve | `go run main.go approve <id>` | Approve a deal |
| CLI reject | `go run main.go reject <id>` | Reject a deal |
| CLI search | `go run main.go search <word>` | Search deals |
| CLI top | `go run main.go top` | Top 10 by value |
| Metrics | `go run main.go collect` | Record every 5 min |
| Metrics | `go run main.go report` | Full analysis |
| Metrics | `go run main.go today` | Today only |

---

## 🧠 Go Concepts Used Across These Tools

| Concept | What it is | Where used |
|---------|-----------|------------|
| `struct` | Like TypeScript interface — defines data shape | All tools |
| `func` | A function | All tools |
| `http.Client` | Makes HTTP requests (like fetch in JS) | Monitor, CLI, Metrics |
| `encoding/json` | Parse JSON responses | All tools |
| `os.Getenv` | Read environment variables | All tools |
| `os.Args` | Read command line arguments | CLI tool |
| `for {}` | Infinite loop — keeps running | Monitor, Notifier, Metrics |
| `time.Sleep` | Wait between checks | Monitor, Notifier, Metrics |
| `switch` | Like if/else for multiple cases | CLI, Metrics |
| `csv.Writer` | Write data to CSV file | Metrics |
| `sort.Slice` | Sort a list | CLI, DB Stats, Metrics |
| `context.WithTimeout` | DB connection timeout | DB Stats |
| `goroutines` (future) | True parallel execution | Can extend any tool |

---

## 🔮 Future Improvements

### Add Telegram Alerts to Monitor
When site goes down, get a WhatsApp-style message instantly:
```go
// In monitor/main.go, replace the TODO with:
func sendTelegramAlert(message string) {
    botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
    chatID := os.Getenv("TELEGRAM_CHAT_ID")
    url := fmt.Sprintf(
        "https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s",
        botToken, chatID, message,
    )
    http.Get(url)
}
```
Get bot token free from @BotFather on Telegram in 2 minutes.

### Deploy Monitor to Railway (run 24/7)
```bash
# Compile for Linux
cd devops-go/monitor
GOOS=linux GOARCH=amd64 go build -o deals-monitor

# Deploy to Railway free tier
# railway.app → New Project → Deploy → add HEALTH_URL env var
# Now runs 24/7 even when your Mac is off
```

### Build Binary (run without go run)
```bash
cd devops-go/deals-cli
go build -o deals-cli

# Now just type:
./deals-cli stats
./deals-cli pending
./deals-cli search rafale
```

---

*Built with Go 1.21 · India Deals Tracker DevOps Suite · February 2026*