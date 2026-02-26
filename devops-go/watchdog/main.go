// deals-watchdog/main.go
//
// MULTI-CLOUD WATCHDOG
// ────────────────────
// Watches your Vercel deployment every 60 seconds.
// If Vercel goes down → automatically deploys backup to Railway via Terraform.
// When Vercel recovers → backup goes on standby again.
//
// Run:
//   go run main.go watchdog    ← runs forever, full auto-failover
//   go run main.go status      ← current state of both clouds
//   go run main.go deploy-backup  ← manually force backup deployment
//   go run main.go teardown-backup ← manually remove Railway backup
//
// Setup:
//   export VERCEL_URL="https://indian-deal-tracker.vercel.app"
//   export RAILWAY_API_TOKEN="your_railway_token"
//   export RAILWAY_PROJECT_ID="your_railway_project_id"
//   export MONGODB_URI="mongodb+srv://..."
//   export NEWS_API_KEY="..."
//   export GROQ_API_KEY="..."
//   export CRON_SECRET="..."
//   export GITHUB_REPO="vipuljain675-projects/Indian-Deal-Tracker-"

package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// ── Colours ──

func green(s string) string  { return "\033[32m" + s + "\033[0m" }
func red(s string) string    { return "\033[31m" + s + "\033[0m" }
func yellow(s string) string { return "\033[33m" + s + "\033[0m" }
func bold(s string) string   { return "\033[1m" + s + "\033[0m" }
func cyan(s string) string   { return "\033[36m" + s + "\033[0m" }
func grey(s string) string   { return "\033[90m" + s + "\033[0m" }
func magenta(s string) string { return "\033[35m" + s + "\033[0m" }

// ── State: tracks current situation ──

type CloudState int

const (
	StateUnknown  CloudState = iota
	StateHealthy             // Vercel is UP, Railway on standby
	StateFailover            // Vercel is DOWN, Railway is serving
	StateRecovery            // Vercel came back, tearing down Railway
)

func (s CloudState) String() string {
	switch s {
	case StateHealthy:
		return green("HEALTHY")
	case StateFailover:
		return red("FAILOVER")
	case StateRecovery:
		return yellow("RECOVERING")
	default:
		return grey("UNKNOWN")
	}
}

// AppConfig — everything needed to deploy
type AppConfig struct {
	VercelURL       string
	RailwayToken    string
	RailwayProjectID string
	GitRepo         string
	EnvVars         map[string]string
}

// ── Load config from env vars + .env.local ──

func readEnvFile(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}
}

func loadConfig() *AppConfig {
	// Auto-load .env.local
	for _, path := range []string{".env.local", "../../.env.local", "../../../.env.local"} {
		if _, err := os.Stat(path); err == nil {
			readEnvFile(path)
			break
		}
	}

	vercelURL := os.Getenv("VERCEL_URL")
	if vercelURL == "" {
		vercelURL = "https://indian-deal-tracker.vercel.app"
	}

	return &AppConfig{
		VercelURL:        vercelURL,
		RailwayToken:     os.Getenv("RAILWAY_API_TOKEN"),
		RailwayProjectID: os.Getenv("RAILWAY_PROJECT_ID"),
		GitRepo:          os.Getenv("GITHUB_REPO"),
		EnvVars: map[string]string{
			"MONGODB_URI":  os.Getenv("MONGODB_URI"),
			"NEWS_API_KEY": os.Getenv("NEWS_API_KEY"),
			"GROQ_API_KEY": os.Getenv("GROQ_API_KEY"),
			"CRON_SECRET":  os.Getenv("CRON_SECRET"),
		},
	}
}

// ── Health check ──

type HealthResp struct {
	Status        string `json:"status"`
	ApprovedDeals int    `json:"approvedDeals"`
}

func checkVercel(url string) (bool, int64, int) {
	start := time.Now()
	client := &http.Client{Timeout: 10 * time.Second}

	healthURL := strings.TrimRight(url, "/") + "/api/health"
	resp, err := client.Get(healthURL)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		return false, elapsed, 0
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var h HealthResp
	json.Unmarshal(body, &h)

	up := resp.StatusCode == 200 && h.Status == "healthy"
	return up, elapsed, h.ApprovedDeals
}

// ── Terraform helpers ──

func checkTerraform() bool {
	_, err := exec.LookPath("terraform")
	return err == nil
}

func runTF(args []string, dir string) error {
	cmd := exec.Command("terraform", args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

func runTFCapture(args []string, dir string) (string, error) {
	cmd := exec.Command("terraform", args...)
	cmd.Dir = dir
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	err := cmd.Run()
	return out.String(), err
}

// ── Generate Railway Terraform config ──
// Railway provider lets you deploy apps just like Vercel
// Same app, same MongoDB — just different hosting

func generateRailwayTF(cfg *AppConfig) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf(`# ============================================================
# RAILWAY BACKUP DEPLOYMENT
# Auto-generated by deals-watchdog
# Generated: %s
# This is the BACKUP — only serves traffic when Vercel is DOWN
# ============================================================

terraform {
  required_providers {
    railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.3"
    }
  }
  backend "local" {
    path = "railway.tfstate"
  }
}

provider "railway" {
  token = "%s"
}

# ── Railway Project ──
# This is your backup deployment on Railway
resource "railway_project" "india_deals_backup" {
  name = "india-deals-tracker-backup"
}

# ── Railway Service ──
# Connects your GitHub repo to Railway
resource "railway_service" "app" {
  name       = "india-deals-tracker"
  project_id = railway_project.india_deals_backup.id

  source = {
    repo   = "%s"
    branch = "main"
  }
}

`, time.Now().Format("2006-01-02 15:04:05"), cfg.RailwayToken, cfg.GitRepo))

	// Environment variables — same as Vercel, same MongoDB
	// This is key — both clouds share ONE database
	sb.WriteString("# ── Environment Variables ──\n")
	sb.WriteString("# SAME MongoDB URI as Vercel — shared database\n")
	sb.WriteString("# Both clouds read/write the same data\n\n")

	for key, value := range cfg.EnvVars {
		resourceName := strings.ToLower(key)
		sb.WriteString(fmt.Sprintf(`resource "railway_variable" "%s" {
  project_id  = railway_project.india_deals_backup.id
  service_id  = railway_service.app.id
  environment = "production"
  name        = "%s"
  value       = "%s"
}

`, resourceName, key, escapeTF(value)))
	}

	// Output the Railway URL after deployment
	sb.WriteString(`# ── Output ──
output "backup_url" {
  description = "Railway backup URL — share this when Vercel is down"
  value       = "https://${railway_service.app.name}.up.railway.app"
}

output "status" {
  value = "BACKUP ACTIVE — Railway deployment running"
}
`)

	return sb.String()
}

func escapeTF(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	s = strings.ReplaceAll(s, `$`, `\$`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	return s
}

// ── Deploy backup to Railway ──

func deployBackup(cfg *AppConfig) (string, error) {
	tfDir := "railway-tf"
	os.MkdirAll(tfDir, 0755)

	// Write Railway terraform config
	tfContent := generateRailwayTF(cfg)
	if err := os.WriteFile(tfDir+"/main.tf", []byte(tfContent), 0644); err != nil {
		return "", fmt.Errorf("cannot write main.tf: %w", err)
	}

	fmt.Println(grey("  → Running terraform init..."))
	if err := runTF([]string{"init", "-upgrade", "-no-color"}, tfDir); err != nil {
		return "", fmt.Errorf("terraform init failed: %w", err)
	}

	fmt.Println(grey("  → Running terraform apply..."))
	if err := runTF([]string{"apply", "-auto-approve", "-no-color"}, tfDir); err != nil {
		return "", fmt.Errorf("terraform apply failed: %w", err)
	}

	// Get the Railway URL from terraform output
	output, _ := runTFCapture([]string{"output", "-raw", "backup_url"}, tfDir)
	backupURL := strings.TrimSpace(output)
	if backupURL == "" {
		backupURL = "https://india-deals-tracker-backup.up.railway.app"
	}

	return backupURL, nil
}

// teardown Railway backup
func teardownBackup() error {
	tfDir := "railway-tf"
	if _, err := os.Stat(tfDir); os.IsNotExist(err) {
		return nil // nothing to teardown
	}

	fmt.Println(grey("  → Running terraform destroy..."))
	return runTF([]string{"destroy", "-auto-approve", "-no-color"}, tfDir)
}

// isBackupDeployed checks if Railway tf state exists
func isBackupDeployed() bool {
	_, err := os.Stat("railway-tf/railway.tfstate")
	return err == nil
}

// ── Log helpers ──

func logLine(icon, cloud, message string) {
	ts := time.Now().Format("2006-01-02 15:04:05")
	fmt.Printf("[%s] %s %s %s\n", grey(ts), icon, cyan(cloud), message)
}

func logAlert(message string) {
	fmt.Printf("\n%s\n", strings.Repeat("!", 60))
	fmt.Printf("  🚨 %s\n", red(bold(message)))
	fmt.Printf("%s\n\n", strings.Repeat("!", 60))
}

func logSuccess(message string) {
	fmt.Printf("\n%s\n", strings.Repeat("=", 60))
	fmt.Printf("  ✅ %s\n", green(bold(message)))
	fmt.Printf("%s\n\n", strings.Repeat("=", 60))
}

// ── Main watchdog loop ──

func cmdWatchdog(cfg *AppConfig) {
	fmt.Println(bold("\n🐕 India Deals Tracker — Multi-Cloud Watchdog"))
	fmt.Println(strings.Repeat("─", 60))
	fmt.Printf("  Primary   : %s\n", cyan(cfg.VercelURL))
	fmt.Printf("  Backup    : %s\n", cyan("Railway (deployed automatically on failure)"))
	fmt.Printf("  Check     : every 60 seconds\n")
	fmt.Printf("  Trigger   : 3 consecutive failures → deploy backup\n")
	fmt.Println(strings.Repeat("─", 60))
	fmt.Println(grey("\nPress Ctrl+C to stop\n"))

	checkInterval := 60 * time.Second
	failThreshold := 3 // failures before deploying backup
	consecutiveFails := 0
	consecutiveSuccesses := 0
	currentState := StateUnknown
	backupURL := ""
	checkCount := 0

	for {
		checkCount++
		up, ms, deals := checkVercel(cfg.VercelURL)

		switch {

		// ── VERCEL IS UP ──
		case up:
			consecutiveFails = 0
			consecutiveSuccesses++

			speedLabel := green("fast")
			if ms > 1000 {
				speedLabel = yellow("slow")
			}
			if ms > 3000 {
				speedLabel = red("very slow")
			}

			logLine("✅", "Vercel", fmt.Sprintf("%s | %dms | %d deals | check #%d",
				speedLabel, ms, deals, checkCount))

			// If we were in failover and Vercel has been up for 3 checks → recover
			if currentState == StateFailover && consecutiveSuccesses >= 3 {
				currentState = StateRecovery
				logSuccess("Vercel has recovered! Tearing down Railway backup...")

				fmt.Println(grey("  → Removing Railway backup deployment..."))
				if err := teardownBackup(); err != nil {
					fmt.Printf("  %s Could not teardown backup: %v\n", yellow("⚠️"), err)
				} else {
					fmt.Printf("  %s Railway backup removed. Vercel is primary again.\n", green("✓"))
					backupURL = ""
					currentState = StateHealthy
				}
			} else if currentState != StateFailover {
				currentState = StateHealthy
			}

		// ── VERCEL IS DOWN ──
		case !up:
			consecutiveSuccesses = 0
			consecutiveFails++

			logLine("❌", "Vercel", fmt.Sprintf("DOWN | %dms | failure %d/%d",
				ms, consecutiveFails, failThreshold))

			// Not enough failures yet — warn but wait
			if consecutiveFails < failThreshold {
				fmt.Printf("  %s Vercel appears down. Waiting to confirm (%d/%d)...\n",
					yellow("⚠️"), consecutiveFails, failThreshold)
				fmt.Printf("  %s Will deploy Railway backup after %d more failure(s)\n",
					grey("→"), failThreshold-consecutiveFails)
			}

			// Hit threshold AND backup not already deployed → DEPLOY BACKUP
			if consecutiveFails >= failThreshold && currentState != StateFailover {
				currentState = StateFailover

				logAlert(fmt.Sprintf(
					"VERCEL IS DOWN! %d consecutive failures detected!\nDeploying backup to Railway NOW...",
					consecutiveFails,
				))

				if cfg.RailwayToken == "" {
					fmt.Printf("  %s RAILWAY_API_TOKEN not set!\n", red("❌"))
					fmt.Println(grey("  → Set it up: railway.app → account → API Tokens"))
					fmt.Println(grey("  → export RAILWAY_API_TOKEN='your_token'"))
					fmt.Println(grey("  → Then restart the watchdog"))
				} else {
					fmt.Println(cyan("  → Deploying to Railway via Terraform..."))
					startTime := time.Now()

					url, err := deployBackup(cfg)
					elapsed := time.Since(startTime).Round(time.Second)

					if err != nil {
						fmt.Printf("  %s Railway deploy failed: %v\n", red("❌"), err)
						fmt.Println(grey("  → Watchdog will retry on next check"))
						currentState = StateUnknown // reset so we retry
					} else {
						backupURL = url
						logSuccess(fmt.Sprintf(
							"BACKUP IS LIVE! Deployed in %s\n  🔗 Share this URL: %s",
							elapsed, backupURL,
						))

						fmt.Printf("  %s Your app is still accessible at:\n", green("✓"))
						fmt.Printf("     %s\n\n", bold(cyan(backupURL)))
						fmt.Println(grey("  → Watchdog will auto-remove Railway when Vercel recovers"))
					}
				}
			}

			// Already in failover — remind user of backup URL
			if currentState == StateFailover && backupURL != "" {
				fmt.Printf("  %s Backup still serving at: %s\n",
					green("✓"), cyan(backupURL))
			}
		}

		time.Sleep(checkInterval)
	}
}

// ── Status command ──

func cmdStatus(cfg *AppConfig) {
	fmt.Println(bold("\n📊 Multi-Cloud Status"))
	fmt.Println(strings.Repeat("─", 50))

	// Check Vercel
	fmt.Print("Checking Vercel... ")
	up, ms, deals := checkVercel(cfg.VercelURL)
	if up {
		fmt.Printf("%s (%dms, %d deals)\n", green("✅ UP"), ms, deals)
	} else {
		fmt.Printf("%s\n", red("❌ DOWN"))
	}
	fmt.Printf("  URL: %s\n", grey(cfg.VercelURL))

	// Check Railway backup
	fmt.Print("\nRailway backup... ")
	if isBackupDeployed() {
		// Try to read backup URL from terraform output
		output, err := runTFCapture([]string{"output", "-raw", "backup_url"}, "railway-tf")
		if err == nil && strings.TrimSpace(output) != "" {
			backupURL := strings.TrimSpace(output)
			upBackup, msBackup, _ := checkVercel(backupURL)
			if upBackup {
				fmt.Printf("%s (%dms)\n", green("✅ ACTIVE"), msBackup)
			} else {
				fmt.Printf("%s\n", yellow("⚠️  DEPLOYED BUT NOT RESPONDING"))
			}
			fmt.Printf("  URL: %s\n", grey(backupURL))
		} else {
			fmt.Printf("%s\n", yellow("⚠️  State file exists but can't get URL"))
		}
	} else {
		fmt.Printf("%s\n", grey("💤 STANDBY (not deployed)"))
		fmt.Printf("  %s\n", grey("Will deploy automatically if Vercel goes down"))
	}

	fmt.Println(strings.Repeat("─", 50))
	if !up && isBackupDeployed() {
		fmt.Printf("Current mode: %s\n", red("🚨 FAILOVER — Railway serving traffic"))
	} else if up {
		fmt.Printf("Current mode: %s\n", green("✅ NORMAL — Vercel serving traffic"))
	} else {
		fmt.Printf("Current mode: %s\n", yellow("⚠️  Vercel down, backup not deployed yet"))
	}
	fmt.Println()
}

// ── Manual deploy backup ──

func cmdDeployBackup(cfg *AppConfig) {
	fmt.Println(bold("\n🚀 Manually deploying backup to Railway..."))
	fmt.Println(strings.Repeat("─", 50))

	if cfg.RailwayToken == "" {
		fmt.Println(red("❌ RAILWAY_API_TOKEN not set!"))
		fmt.Println(grey("   railway.app → account settings → API Tokens → Create"))
		fmt.Println(grey("   export RAILWAY_API_TOKEN='your_token'"))
		return
	}

	url, err := deployBackup(cfg)
	if err != nil {
		fmt.Printf("%s %v\n", red("❌ Deploy failed:"), err)
		return
	}

	fmt.Printf("\n%s\n", green("✅ Backup deployed successfully!"))
	fmt.Printf("   URL: %s\n\n", bold(cyan(url)))
}

// ── Manual teardown ──

func cmdTeardownBackup() {
	fmt.Println(bold("\n🗑️  Tearing down Railway backup..."))
	fmt.Println(strings.Repeat("─", 50))

	if !isBackupDeployed() {
		fmt.Println(yellow("⚠️  No backup deployment found. Nothing to teardown."))
		return
	}

	if err := teardownBackup(); err != nil {
		fmt.Printf("%s %v\n", red("❌ Teardown failed:"), err)
		return
	}

	fmt.Println(green("✅ Railway backup removed. Vercel is sole deployment."))
}

func cmdHelp() {
	fmt.Println(bold("\n🐕 India Deals Tracker — Multi-Cloud Watchdog"))
	fmt.Println(grey("Auto-deploys Railway backup when Vercel goes down\n"))

	fmt.Println(bold("Commands:"))
	cmds := [][]string{
		{"watchdog", "Run forever — auto failover to Railway on Vercel failure"},
		{"status", "Check current state of Vercel + Railway"},
		{"deploy-backup", "Manually deploy Railway backup right now"},
		{"teardown-backup", "Manually remove Railway backup"},
		{"help", "Show this message"},
	}
	for _, c := range cmds {
		fmt.Printf("  %-20s %s\n", cyan(c[0]), c[1])
	}

	fmt.Println(bold("\nHow it works:"))
	fmt.Println(grey("  1. Checks Vercel every 60 seconds"))
	fmt.Println(grey("  2. After 3 consecutive failures → deploys Railway backup via Terraform"))
	fmt.Println(grey("  3. Prints Railway URL → you share it manually"))
	fmt.Println(grey("  4. When Vercel recovers → automatically removes Railway backup"))
	fmt.Println(grey("  5. Back to normal — Vercel is primary again"))

	fmt.Println(bold("\nSetup (Railway):"))
	fmt.Println(grey("  1. railway.app → create account (free)"))
	fmt.Println(grey("  2. Account Settings → API Tokens → Create Token"))
	fmt.Println(grey("  3. export RAILWAY_API_TOKEN='your_token'"))
	fmt.Println(grey("  4. go run main.go watchdog"))

	fmt.Println(bold("\nRequired env vars:"))
	vars := [][]string{
		{"VERCEL_URL", "https://indian-deal-tracker.vercel.app (default)"},
		{"RAILWAY_API_TOKEN", "railway.app → account → API Tokens"},
		{"MONGODB_URI", "auto-loaded from .env.local"},
		{"NEWS_API_KEY", "auto-loaded from .env.local"},
		{"GROQ_API_KEY", "auto-loaded from .env.local"},
		{"CRON_SECRET", "auto-loaded from .env.local"},
		{"GITHUB_REPO", "e.g. vipuljain675-projects/Indian-Deal-Tracker-"},
	}
	for _, v := range vars {
		fmt.Printf("  %-22s %s\n", cyan(v[0]), grey(v[1]))
	}
	fmt.Println()
}

// ── Main ──

func main() {
	if !checkTerraform() {
		fmt.Println(red("\n❌ Terraform not installed!"))
		fmt.Println(yellow("   Fix: brew uninstall terraform && brew install terraform"))
		os.Exit(1)
	}

	cfg := loadConfig()

	args := os.Args[1:]
	if len(args) == 0 {
		cmdHelp()
		return
	}

	switch args[0] {
	case "watchdog":
		cmdWatchdog(cfg)
	case "status":
		cmdStatus(cfg)
	case "deploy-backup":
		cmdDeployBackup(cfg)
	case "teardown-backup":
		cmdTeardownBackup()
	case "help", "--help", "-h":
		cmdHelp()
	default:
		fmt.Printf("\n%s '%s'\n", red("❌ Unknown command:"), args[0])
		cmdHelp()
	}
}