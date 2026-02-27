# 🐹 Golang DevOps Manifesto
## India Deals Tracker — Complete DevOps Reference

> Everything you need to run, understand, and extend the 7 Go DevOps tools built for this project.

---

## 📁 Folder Structure

```
india-deals-tracker/
└── devops-go/
    ├── monitor/        ← Tool 1: Health Monitor
    ├── notifier/       ← Tool 2: Deployment Watcher
    ├── dbstats/        ← Tool 3: Database Stats
    ├── deals-cli/      ← Tool 4: CLI Tool
    ├── metrics/        ← Tool 5: Metrics Collector
    ├── deals-infra/    ← Tool 6: Infrastructure Manager (Terraform)
    └── watchdog/       ← Tool 7: Multi-Cloud Deploy + Failover
```

---

## ⚙️ One-Time Setup

Install Go (if not already installed):
```bash
brew install go
go version   # should show go1.21+
```

Install Terraform (needed for Tools 6 & 7):
```bash
brew uninstall terraform   # if old version exists
brew install terraform
terraform version          # should show v1.14.6+
```

Set your environment variables — add to `~/.zshrc` to make permanent:
```bash
nano ~/.zshrc
# paste everything below, save with Ctrl+X → Y → Enter
source ~/.zshrc   # reload
```

```bash
# App
export BASE_URL="https://indian-deal-tracker.vercel.app"
export CRON_SECRET="mySuperSecret123"
export HEALTH_URL="https://indian-deal-tracker.vercel.app/api/health"

# Database
export MONGODB_URI="mongodb+srv://vipuljain675_db_user:...@cluster0.xpr7jsw.mongodb.net/finbank"

# GitHub
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_REPO="vipuljain675-projects/Indian-Deal-Tracker-"

# Vercel (for Tool 6)
export VERCEL_API_TOKEN="your_vercel_token"
export VERCEL_PROJECT_ID="prj_xxxxxxxxxxxx"
export VERCEL_ORG_ID="team_xxxxxxxxxxxx"

# Render (for Tool 7)
export RENDER_API_TOKEN="rnd_xxxxxxxxxxxx"
export RENDER_OWNER_ID="tea-d58k22ili9vc73a4ac00"
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

**What you'll see:**
```
[2026-02-26 16:44:39] ✅ UP  | 465ms | 161 deals | Uptime: 100.0%
[2026-02-26 16:45:39] ✅ UP  | 435ms | 161 deals | Uptime: 100.0%
[2026-02-26 16:46:40] ❌ DOWN | Error: connection timeout
🚨 ALERT: Site has been DOWN for 3 consecutive checks!
```

**Stop it:** `Ctrl+C`

---

---

## 🚀 Tool 2 — Deployment Watcher

**What it does:**
Watches your GitHub Actions pipeline every 30 seconds.
When you `git push`, tells you instantly when deploy starts, runs, succeeds or fails.

**Location:** `devops-go/notifier/`

**Run:**
```bash
cd devops-go/notifier
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_REPO="vipuljain675-projects/Indian-Deal-Tracker-"
go run main.go
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
Connects directly to MongoDB Atlas and prints a full breakdown —
counts, countries, types, values, pending items. Faster than Atlas UI.

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
📊 OVERVIEW
   Total documents in DB : 164
   Approved deals        : 161
   Pending review        : 3
   Total estimated value : $2505.1B

🌍 TOP 10 PARTNER COUNTRIES
   USA    ████████████████████████████████████ 37
   Russia ████████████████████████ 25
   France ████████████ 13

📦 DEAL TYPES
   Defense Acquisition  63 deals (39%)
   Trade                34 deals (21%)

⚡ IMPACT LEVELS
   🔴 High Impact   95 deals
   🟡 Medium Impact 53 deals
   🟢 Low Impact    13 deals
```

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

### All Commands

```bash
go run main.go stats              # Live DB overview
go run main.go pending            # Deals waiting for approval
go run main.go approve <id>       # Approve a deal → goes live
go run main.go reject <id>        # Reject a deal → removed
go run main.go search rafale      # Search by keyword
go run main.go top                # Top 10 deals by value
go run main.go help               # Show all commands
```

**Example — pending:**
```
📋 3 deals waiting for review:

[1]  India-Japan Semiconductor Partnership
    ID      : 65abc123def456789012345a
    Country : Japan | Value : $2.5B | Impact : 🔴 High

    approve: go run main.go approve 65abc123def456789012345a
    reject:  go run main.go reject  65abc123def456789012345a
```

**Example — search rafale:**
```
🔍 3 deals matching "rafale":

  114 Rafale MRFA Deal · France · $40B · In Progress · 2025
  India-France Rafale Deal · France · $35B · Proposed · 2026
  India-France Rafale Fighter Jet Deal · France · $8.7B · Completed · 2016
```

---

---

## 📈 Tool 5 — Metrics Collector

**What it does:**
Records your app's response time and deal count every 5 minutes
into `metrics.csv`. Shows trends over time.

**Location:** `devops-go/metrics/`

### Commands

```bash
cd devops-go/metrics

go run main.go collect   # Run forever — records every 5 min
go run main.go report    # Full analysis of all data
go run main.go today     # Just today's metrics
```

**Example — collect:**
```
[18:10:17] ✅ UP | fast 655ms  | 161 deals | Check #1
[18:33:39] ✅ UP | slow 1046ms | 161 deals | Check #3  ← caught slow!
[19:41:25] ✅ UP | fast 629ms  | 164 deals | Check #8  ← deals grew 161→164!
```

**Example — report:**
```
📈 OVERALL PERFORMANCE
  Uptime        100.00%
  Avg response  623ms
  Fastest       435ms
  P95 response  980ms   ← worst case 95% of the time

🕐 BY HOUR
  09:00  ███████ 550ms  ← morning fast
  14:00  ████████████ 800ms  ← afternoon slower
  22:00  █████ 400ms  ← night fastest
```

Speed labels: `fast` <500ms ✅ | `slow` 500-1500ms ⚠️ | `very slow` >3000ms 🚨

---

---

## 🏗️ Tool 6 — Infrastructure Manager

**What it does:**
Go generates a complete Terraform config describing your entire Vercel
infrastructure, then runs `terraform apply` automatically.
If you ever lose your Vercel project — one command recreates everything.

**Location:** `devops-go/deals-infra/`

**Setup — get your Vercel IDs:**
- `VERCEL_API_TOKEN` → vercel.com → Settings → Tokens → Create
- `VERCEL_PROJECT_ID` → vercel.com → your project → Settings → General → Project ID
- `VERCEL_ORG_ID` → vercel.com → Settings → General → Team ID

### Commands

```bash
cd devops-go/deals-infra

go run main.go generate   # Preview the .tf file — safe, no changes
go run main.go plan       # Dry run — show what would change
go run main.go deploy     # Full deploy: generate .tf + terraform apply
go run main.go status     # Show current deployed state
go run main.go destroy    # Remove Vercel project (careful!)
```

**What deploy does:**
```
📝 Step 1/3 — Generating infrastructure.tf...
   Describes: 1 Vercel project + 4 env vars + GitHub connection + Mumbai region

📦 Step 2/3 — terraform init...
   Vercel provider downloaded

⚡ Step 3/3 — terraform apply...
   Type 'yes' to confirm

✅ Done! Vercel project is live.
```

**⚠️ Never commit these files (already in .gitignore):**
```
infrastructure.tf    ← contains your secrets
terraform.tfstate    ← contains deployed state
.terraform/          ← provider binaries
```

---

---

## 🐕 Tool 7 — Multi-Cloud Watchdog

**What it does:**
Deploy your app to ANY cloud with a single command.
Vercel, Railway, or Render — your choice, any time.
Both clouds share the **same MongoDB** — data always identical.

Also has **auto-failover mode**: if Vercel goes down, automatically
deploys a backup to Render. When Vercel recovers, removes backup automatically.

**Location:** `devops-go/watchdog/`

**Setup — get Render credentials:**
```bash
# 1. render.com → Account Settings → API Keys → Create API Key

# 2. Get Owner ID:
curl -H "Authorization: Bearer your_render_token" \
  "https://api.render.com/v1/owners?limit=1"
# Copy the "id" value → looks like "tea-xxxxxxxxxxxx"

export RENDER_API_TOKEN="rnd_xxxxxxxxxxxx"
export RENDER_OWNER_ID="tea-d58k22ili9vc73a4ac00"
```

### Commands

```bash
cd devops-go/watchdog

# ── Deploy to any cloud ──
go run main.go deploy vercel    # Deploy to Vercel
go run main.go deploy render    # Deploy to Render ← we did this!
go run main.go deploy railway   # Deploy to Railway

# ── Remove a deployment ──
go run main.go destroy vercel
go run main.go destroy render
go run main.go destroy railway

# ── Monitor ──
go run main.go status           # Check all clouds at once
go run main.go watchdog         # Auto-failover mode (runs forever)
```

**Example — deploy render:**
```
🚀 Deploying to RENDER...
  App    : india-deals-tracker
  Cloud  : render
  Repo   : vipuljain675-projects/Indian-Deal-Tracker-
  EnvVars: 4 variables

📝 Step 1/3 — Generating render.tf...
📦 Step 2/3 — terraform init... ✓
⚡ Step 3/3 — terraform apply... type 'yes'

✅ Deployed to RENDER!
   🔗 URL: https://india-deals-tracker.onrender.com
```

**Example — status:**
```
📊 Multi-Cloud Status
  Vercel  (primary)  ✅ UP (610ms, 164 deals)
  Railway (backup)   💤 not deployed
  Render  (backup)   ✅ UP (890ms, 164 deals)
```

**Example — watchdog mode:**
```
[21:00] ✅ Vercel UP | fast | 438ms
[21:02] ❌ Vercel DOWN | failure 1/3
[21:04] ❌ Vercel DOWN | failure 3/3

🚨 VERCEL IS DOWN! Deploying backup to Render...
✅ BACKUP LIVE: https://india-deals-tracker.onrender.com
   Share this URL until Vercel recovers!

[21:35] ✅ Vercel recovered! Removing Render backup...
✅ Back to normal. Vercel is primary.
```

**Current live deployments:**
| Cloud | URL |
|-------|-----|
| Vercel (primary) | https://indian-deal-tracker.vercel.app |
| Render (backup) | https://india-deals-tracker.onrender.com |

---

---

## 🖥️ Run All 7 Tools

```bash
# Tab 1 — Health Monitor (runs forever)
cd devops-go/monitor && go run main.go

# Tab 2 — Deployment Watcher (runs forever)
cd devops-go/notifier && go run main.go

# Tab 3 — Metrics Collector (runs forever)
cd devops-go/metrics && go run main.go collect

# Tab 4 — Watchdog auto-failover (runs forever)
cd devops-go/watchdog && go run main.go watchdog

# Tab 5 — DB Stats (run on demand)
cd devops-go/dbstats && MONGODB_URI="..." go run main.go

# Tab 6 — CLI Tool (run on demand)
cd devops-go/deals-cli && go run main.go stats

# Tab 7 — Infrastructure (run on demand)
cd devops-go/deals-infra && go run main.go status
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
| Infra | `go run main.go generate` | Preview .tf file |
| Infra | `go run main.go plan` | Dry run |
| Infra | `go run main.go deploy` | Full Vercel deploy |
| Watchdog | `go run main.go deploy render` | Deploy to Render |
| Watchdog | `go run main.go deploy railway` | Deploy to Railway |
| Watchdog | `go run main.go deploy vercel` | Deploy to Vercel |
| Watchdog | `go run main.go destroy render` | Remove from Render |
| Watchdog | `go run main.go status` | Check all clouds |
| Watchdog | `go run main.go watchdog` | Auto-failover mode |

---

## 🧠 Go Concepts Used

| Concept | What it is | Where used |
|---------|-----------|------------|
| `struct` | Like TypeScript interface | All tools |
| `func` | A function | All tools |
| `http.Client` | HTTP requests (like fetch) | Monitor, CLI, Metrics, Watchdog |
| `encoding/json` | Parse JSON | All tools |
| `os.Getenv` | Read env vars | All tools |
| `os.Args` | Read CLI arguments | CLI, Watchdog, Infra |
| `os/exec` | Run other programs (terraform) | Watchdog, Infra |
| `for {}` | Infinite loop | Monitor, Notifier, Metrics, Watchdog |
| `time.Sleep` | Wait between checks | Monitor, Notifier, Metrics |
| `switch` | If/else for multiple cases | All tools |
| `strings.Builder` | Build long strings | Watchdog, Infra |
| `os.WriteFile` | Write file to disk | Watchdog, Infra |
| `bufio.Scanner` | Read file line by line | Watchdog, Infra |
| `csv.Writer` | Write CSV file | Metrics |
| `sort.Slice` | Sort a list | CLI, DB Stats, Metrics |
| `context.WithTimeout` | DB connection timeout | DB Stats |

---

## 🔮 Future Improvements

### Telegram Alerts
```go
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
Add to monitor → get Telegram message when site goes down.

### Build Binaries (skip `go run`)
```bash
cd devops-go/deals-cli && go build -o deals-cli
./deals-cli stats
./deals-cli search rafale

cd devops-go/watchdog && go build -o watchdog
./watchdog deploy render
./watchdog status
```

### Deploy Monitor 24/7 on Render
```bash
# Compile for Linux
cd devops-go/monitor
GOOS=linux GOARCH=amd64 go build -o deals-monitor

# render.com → New Web Service → add HEALTH_URL env var
# Monitors your site 24/7 even when Mac is off
```

### Add More Clouds to Watchdog
```go
// In watchdog/main.go, add to the clouds map:
"netlify": {
    dir:      "tf-netlify",
    generate: func() string { return generateNetlifyTF(cfg) },
    token:    cfg.NetlifyToken,
    tokenVar: "NETLIFY_API_TOKEN",
},
// Then: go run main.go deploy netlify
```

---

## 🌐 Live URLs

| Environment | URL |
|-------------|-----|
| Vercel (primary) | https://indian-deal-tracker.vercel.app |
| Render (backup) | https://india-deals-tracker.onrender.com |

---

*Built with Go 1.21 + Terraform 1.14 · India Deals Tracker DevOps Suite · February 2026*
*7 tools · 2 clouds · 1 database · infinite reliability 🇮🇳*