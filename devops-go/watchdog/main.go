// deals-watchdog/main.go
//
// MULTI-CLOUD DEPLOY TOOL
// ───────────────────────
// Deploy your app to ANY cloud with a single command.
// Your choice, any time — no waiting for failures.
//
// Commands:
//   go run main.go deploy vercel     → deploy to Vercel
//   go run main.go deploy railway    → deploy to Railway
//   go run main.go deploy render     → deploy to Render
//   go run main.go status            → check all clouds
//   go run main.go destroy railway   → remove Railway deployment
//   go run main.go destroy vercel    → remove Vercel deployment
//   go run main.go watchdog          → auto-failover mode (original)
//   go run main.go help              → show all commands

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
func green(s string) string   { return "\033[32m" + s + "\033[0m" }
func red(s string) string     { return "\033[31m" + s + "\033[0m" }
func yellow(s string) string  { return "\033[33m" + s + "\033[0m" }
func bold(s string) string    { return "\033[1m" + s + "\033[0m" }
func cyan(s string) string    { return "\033[36m" + s + "\033[0m" }
func grey(s string) string    { return "\033[90m" + s + "\033[0m" }

// ── Config ──
type AppConfig struct {
	AppName    string
	Framework  string
	GitRepo    string
	EnvVars    map[string]string

	// Cloud credentials
	VercelToken     string
	VercelProjectID string
	VercelOrgID     string
	RailwayToken    string
	RenderToken     string
}

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
	for _, path := range []string{".env.local", "../../.env.local", "../../../.env.local"} {
		if _, err := os.Stat(path); err == nil {
			readEnvFile(path)
			break
		}
	}

	gitRepo := os.Getenv("GITHUB_REPO")
	if gitRepo == "" {
		gitRepo = "vipuljain675-projects/Indian-Deal-Tracker-"
	}

	return &AppConfig{
		AppName:   "india-deals-tracker",
		Framework: "nextjs",
		GitRepo:   gitRepo,
		EnvVars: map[string]string{
			"MONGODB_URI":  os.Getenv("MONGODB_URI"),
			"NEWS_API_KEY": os.Getenv("NEWS_API_KEY"),
			"GROQ_API_KEY": os.Getenv("GROQ_API_KEY"),
			"CRON_SECRET":  os.Getenv("CRON_SECRET"),
		},
		VercelToken:     os.Getenv("VERCEL_API_TOKEN"),
		VercelProjectID: os.Getenv("VERCEL_PROJECT_ID"),
		VercelOrgID:     os.Getenv("VERCEL_ORG_ID"),
		RailwayToken:    os.Getenv("RAILWAY_API_TOKEN"),
		RenderToken:     os.Getenv("RENDER_API_TOKEN"),
	}
}

func escapeTF(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	s = strings.ReplaceAll(s, `$`, `\$`)
	s = strings.ReplaceAll(s, "\n", `\n`)
	return s
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

// ── Terraform config generators ──
// Each cloud gets its own generator function
// Same app, same DB — just different provider block

func generateVercelTF(cfg *AppConfig) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`# AUTO-GENERATED — Vercel Deployment
# Generated: %s
# App: %s

terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
  backend "local" {
    path = "vercel.tfstate"
  }
}

provider "vercel" {}

resource "vercel_project" "app" {
  name      = "%s"
  team_id   = "%s"
  framework = "%s"

  git_repository = {
    type              = "github"
    repo              = "%s"
    production_branch = "main"
  }

  build_command    = "npm run build"
  output_directory = ".next"
  install_command  = "npm install"

  # Mumbai region — closest to India
  serverless_function_region = "bom1"
}

`, time.Now().Format("2006-01-02 15:04:05"),
		cfg.AppName, cfg.AppName, cfg.VercelOrgID,
		cfg.Framework, cfg.GitRepo))

	// Env vars
	for key, value := range cfg.EnvVars {
		sb.WriteString(fmt.Sprintf(`resource "vercel_env_var" "%s" {
  project_id = vercel_project.app.id
  team_id    = "%s"
  key        = "%s"
  value      = "%s"
  target     = ["production", "preview", "development"]
  sensitive  = true
}

`, strings.ToLower(key), cfg.VercelOrgID, key, escapeTF(value)))
	}

	sb.WriteString(`output "url" {
  value = "https://${vercel_project.app.name}.vercel.app"
}
`)
	return sb.String()
}

func generateRailwayTF(cfg *AppConfig) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`# AUTO-GENERATED — Railway Deployment
# Generated: %s
# App: %s

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

resource "railway_project" "app" {
  name = "%s"
}

resource "railway_service" "web" {
  name       = "%s"
  project_id = railway_project.app.id

  source = {
    repo   = "%s"
    branch = "main"
  }
}

`, time.Now().Format("2006-01-02 15:04:05"),
		cfg.AppName, cfg.RailwayToken,
		cfg.AppName, cfg.AppName, cfg.GitRepo))

	for key, value := range cfg.EnvVars {
		sb.WriteString(fmt.Sprintf(`resource "railway_variable" "%s" {
  project_id  = railway_project.app.id
  service_id  = railway_service.web.id
  environment = "production"
  name        = "%s"
  value       = "%s"
}

`, strings.ToLower(key), key, escapeTF(value)))
	}

	sb.WriteString(`output "url" {
  value = "https://${railway_service.web.name}.up.railway.app"
}
`)
	return sb.String()
}

func generateRenderTF(cfg *AppConfig) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`# AUTO-GENERATED — Render Deployment
# Generated: %s
# App: %s

terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.8"
    }
  }
  backend "local" {
    path = "render.tfstate"
  }
}

provider "render" {
  api_key  = "%s"
  owner_id = "%s"
}

resource "render_web_service" "app" {
  name   = "%s"
  region = "singapore"
  plan   = "free"

  runtime_source = {
    native_runtime = {
      auto_deploy_trigger = "commit"
      branch              = "main"
      build_command       = "npm install && npm run build"
      repo_url            = "https://github.com/%s"
      runtime             = "node"
    }
  }

  start_command = "npm start"

  env_vars = {
`, time.Now().Format("2006-01-02 15:04:05"),
		cfg.AppName, cfg.RenderToken,
		os.Getenv("RENDER_OWNER_ID"),
		cfg.AppName, cfg.GitRepo))

	for key, value := range cfg.EnvVars {
		sb.WriteString(fmt.Sprintf("    %s = { value = \"%s\" }\n", key, escapeTF(value)))
	}

	sb.WriteString(`  }
}

output "url" {
  value = render_web_service.app.url
}
`)
	return sb.String()
}

// ── Deploy to a specific cloud ──

func deploy(cloud string, cfg *AppConfig) {
	// Map cloud name → tf directory + generator function
	type CloudInfo struct {
		dir      string
		generate func() string
		token    string
		tokenVar string
	}

	clouds := map[string]CloudInfo{
		"vercel": {
			dir:      "tf-vercel",
			generate: func() string { return generateVercelTF(cfg) },
			token:    cfg.VercelToken,
			tokenVar: "VERCEL_API_TOKEN",
		},
		"railway": {
			dir:      "tf-railway",
			generate: func() string { return generateRailwayTF(cfg) },
			token:    cfg.RailwayToken,
			tokenVar: "RAILWAY_API_TOKEN",
		},
		"render": {
			dir:      "tf-render",
			generate: func() string { return generateRenderTF(cfg) },
			token:    cfg.RenderToken,
			tokenVar: "RENDER_API_TOKEN",
		},
	}

	info, ok := clouds[cloud]
	if !ok {
		fmt.Printf("\n%s '%s'\n", red("❌ Unknown cloud:"), cloud)
		fmt.Printf("Available clouds: %s\n", cyan("vercel  railway  render"))
		return
	}

	// Check token exists
	if info.token == "" {
		fmt.Printf("\n%s\n", red("❌ Missing token for "+cloud+"!"))
		fmt.Printf("   Set: %s\n", yellow("export "+info.tokenVar+"='your_token'"))
		switch cloud {
		case "vercel":
			fmt.Println(grey("   Get it: vercel.com → Settings → Tokens → Create"))
		case "railway":
			fmt.Println(grey("   Get it: railway.app → Account Settings → API Tokens"))
		case "render":
			fmt.Println(grey("   Get it: render.com → Account Settings → API Keys"))
		}
		return
	}

	fmt.Printf("\n%s\n", bold("🚀 Deploying to "+strings.ToUpper(cloud)+"..."))
	fmt.Println(strings.Repeat("─", 50))
	fmt.Printf("  App    : %s\n", cfg.AppName)
	fmt.Printf("  Cloud  : %s\n", cyan(cloud))
	fmt.Printf("  Repo   : %s\n", cfg.GitRepo)
	fmt.Printf("  EnvVars: %d variables\n", len(cfg.EnvVars))
	fmt.Println(strings.Repeat("─", 50))

	// Create tf directory
	os.MkdirAll(info.dir, 0755)

	// Step 1: Generate .tf file
	fmt.Printf("\n📝 Step 1/3 — Generating %s.tf...\n", cloud)
	tfContent := info.generate()
	tfFile := info.dir + "/main.tf"
	if err := os.WriteFile(tfFile, []byte(tfContent), 0644); err != nil {
		fmt.Printf("%s %v\n", red("❌"), err)
		return
	}
	fmt.Printf("   %s Written %s\n", green("✓"), grey(tfFile))

	// Step 2: terraform init
	fmt.Printf("\n📦 Step 2/3 — terraform init...\n")
	fmt.Println(strings.Repeat("─", 50))
	if err := runTF([]string{"init", "-upgrade"}, info.dir); err != nil {
		fmt.Printf("\n%s terraform init failed\n", red("❌"))
		return
	}

	// Step 3: terraform apply
	fmt.Println(strings.Repeat("─", 50))
	fmt.Printf("\n⚡ Step 3/3 — terraform apply...\n")
	fmt.Println(grey("   Review the plan then type 'yes' to confirm."))
	fmt.Println(strings.Repeat("─", 50))
	if err := runTF([]string{"apply"}, info.dir); err != nil {
		fmt.Printf("\n%s terraform apply failed\n", red("❌"))
		return
	}

	// Get output URL
	url, _ := runTFCapture([]string{"output", "-raw", "url"}, info.dir)
	url = strings.TrimSpace(url)

	fmt.Printf("\n%s\n", green("✅ Deployed to "+strings.ToUpper(cloud)+"!"))
	if url != "" {
		fmt.Printf("   🔗 URL: %s\n", bold(cyan(url)))
	}
	fmt.Println()
}

// ── Destroy a specific cloud deployment ──

func destroy(cloud string) {
	dirs := map[string]string{
		"vercel":  "tf-vercel",
		"railway": "tf-railway",
		"render":  "tf-render",
	}

	dir, ok := dirs[cloud]
	if !ok {
		fmt.Printf("%s '%s'\n", red("❌ Unknown cloud:"), cloud)
		return
	}

	if _, err := os.Stat(dir); os.IsNotExist(err) {
		fmt.Printf("\n%s No %s deployment found. Nothing to destroy.\n",
			yellow("⚠️"), cloud)
		return
	}

	fmt.Printf("\n%s\n", bold("💥 Destroying "+strings.ToUpper(cloud)+" deployment..."))
	fmt.Printf("%s This will take the app OFFLINE on %s!\n", red("⚠️"), cloud)
	fmt.Print("Type 'yes' to confirm: ")

	var confirm string
	fmt.Scanln(&confirm)
	if confirm != "yes" {
		fmt.Println(green("Cancelled."))
		return
	}

	runTF([]string{"destroy", "-auto-approve"}, dir)
	fmt.Printf("\n%s %s deployment removed.\n", green("✅"), strings.ToUpper(cloud))
}

// ── Status: check all clouds ──

type HealthResp struct {
	Status        string `json:"status"`
	ApprovedDeals int    `json:"approvedDeals"`
}

func checkURL(url string) (bool, int64, int) {
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
	return resp.StatusCode == 200 && h.Status == "healthy", elapsed, h.ApprovedDeals
}

func cmdStatus(cfg *AppConfig) {
	fmt.Println(bold("\n📊 Multi-Cloud Status"))
	fmt.Println(strings.Repeat("─", 55))

	type CloudStatus struct {
		name    string
		url     string
		stateFile string
	}

	clouds := []CloudStatus{
		{"Vercel  (primary)", "https://indian-deal-tracker.vercel.app", "tf-vercel/vercel.tfstate"},
		{"Railway (backup)", "", "tf-railway/railway.tfstate"},
		{"Render  (backup)", "", "tf-render/render.tfstate"},
	}

	for _, c := range clouds {
		deployed := false
		if _, err := os.Stat(c.stateFile); err == nil {
			deployed = true
		}

		if !deployed && c.name != "Vercel  (primary)" {
			fmt.Printf("  %-22s %s\n", bold(c.name), grey("💤 not deployed"))
			continue
		}

		url := c.url
		if url == "" && deployed {
			// Try to get URL from terraform output
			dir := strings.Split(c.stateFile, "/")[0]
			out, _ := runTFCapture([]string{"output", "-raw", "url"}, dir)
			url = strings.TrimSpace(out)
		}

		if url == "" {
			fmt.Printf("  %-22s %s\n", bold(c.name), yellow("⚠️  deployed but URL unknown"))
			continue
		}

		fmt.Printf("  %-22s ", bold(c.name))
		up, ms, deals := checkURL(url)
		if up {
			fmt.Printf("%s (%dms, %d deals)\n", green("✅ UP"), ms, deals)
			fmt.Printf("  %-22s %s\n", "", grey(url))
		} else {
			fmt.Printf("%s\n", red("❌ DOWN"))
			fmt.Printf("  %-22s %s\n", "", grey(url))
		}
	}
	fmt.Println(strings.Repeat("─", 55))
	fmt.Println()
}

// ── Watchdog: auto-failover mode ──

func cmdWatchdog(cfg *AppConfig) {
	fmt.Println(bold("\n🐕 Watchdog Mode — Auto Failover"))
	fmt.Println(strings.Repeat("─", 50))
	fmt.Printf("  Primary : %s\n", cyan("Vercel"))
	fmt.Printf("  Backup  : %s\n", cyan("Railway (auto-deployed on failure)"))
	fmt.Printf("  Interval: every 60 seconds\n")
	fmt.Printf("  Trigger : 3 consecutive failures\n")
	fmt.Println(strings.Repeat("─", 50))
	fmt.Println(grey("\nPress Ctrl+C to stop\n"))

	vercelURL := "https://indian-deal-tracker.vercel.app"
	fails := 0
	successes := 0
	inFailover := false
	backupURL := ""
	checkCount := 0

	for {
		checkCount++
		up, ms, deals := checkURL(vercelURL)
		ts := time.Now().Format("15:04:05")

		if up {
			fails = 0
			successes++
			speed := green("fast")
			if ms > 1000 { speed = yellow("slow") }
			if ms > 3000 { speed = red("very slow") }
			fmt.Printf("[%s] ✅ Vercel UP | %s | %dms | %d deals | #%d\n",
				grey(ts), speed, ms, deals, checkCount)

			// Vercel recovered — teardown backup after 3 good checks
			if inFailover && successes >= 3 {
				fmt.Printf("\n%s Vercel recovered! Removing Railway backup...\n",
					green("✅"))
				runTF([]string{"destroy", "-auto-approve"}, "tf-railway")
				inFailover = false
				backupURL = ""
				fmt.Println(green("✓ Back to normal. Vercel is primary.\n"))
			}
		} else {
			successes = 0
			fails++
			fmt.Printf("[%s] ❌ Vercel DOWN | %dms | failure %d/3\n",
				grey(ts), ms, fails)

			if fails >= 3 && !inFailover {
				inFailover = true
				fmt.Printf("\n%s\n", red("🚨 VERCEL DOWN! Deploying Railway backup..."))
				deploy("railway", cfg)

				out, _ := runTFCapture([]string{"output", "-raw", "url"}, "tf-railway")
				backupURL = strings.TrimSpace(out)
				if backupURL != "" {
					fmt.Printf("\n%s Backup live: %s\n\n",
						green("✅"), bold(cyan(backupURL)))
				}
			}

			if inFailover && backupURL != "" {
				fmt.Printf("   %s Backup serving: %s\n", green("✓"), cyan(backupURL))
			}
		}

		time.Sleep(60 * time.Second)
	}
}

func cmdHelp() {
	fmt.Println(bold("\n🚀 India Deals Tracker — Multi-Cloud Deploy Tool"))
	fmt.Println(grey("Deploy to any cloud with a single command\n"))

	fmt.Println(bold("Deploy:"))
	fmt.Printf("  %s  Deploy to Vercel\n", cyan("go run main.go deploy vercel"))
	fmt.Printf("  %s  Deploy to Railway\n", cyan("go run main.go deploy railway"))
	fmt.Printf("  %s   Deploy to Render\n", cyan("go run main.go deploy render"))

	fmt.Println(bold("\nRemove:"))
	fmt.Printf("  %s  Remove Vercel deployment\n", cyan("go run main.go destroy vercel"))
	fmt.Printf("  %s  Remove Railway deployment\n", cyan("go run main.go destroy railway"))

	fmt.Println(bold("\nMonitor:"))
	fmt.Printf("  %s          Check all clouds\n", cyan("go run main.go status"))
	fmt.Printf("  %s        Auto-failover mode\n", cyan("go run main.go watchdog"))

	fmt.Println(bold("\nTokens needed per cloud:"))
	fmt.Println(grey("  Vercel  → vercel.com → Settings → Tokens"))
	fmt.Println(grey("           export VERCEL_API_TOKEN=..."))
	fmt.Println(grey("           export VERCEL_PROJECT_ID=..."))
	fmt.Println(grey("           export VERCEL_ORG_ID=..."))
	fmt.Println(grey("  Railway → railway.app → Account → API Tokens"))
	fmt.Println(grey("           export RAILWAY_API_TOKEN=..."))
	fmt.Println(grey("  Render  → render.com → Account → API Keys"))
	fmt.Println(grey("           export RENDER_API_TOKEN=..."))
	fmt.Println()
}

func main() {
	if !checkTerraform() {
		fmt.Println(red("\n❌ Terraform not installed!"))
		fmt.Println(yellow("   brew uninstall terraform && brew install terraform"))
		os.Exit(1)
	}

	cfg := loadConfig()

	args := os.Args[1:]
	if len(args) == 0 {
		cmdHelp()
		return
	}

	switch args[0] {
	case "deploy":
		if len(args) < 2 {
			fmt.Println(red("❌ Specify a cloud: deploy vercel | deploy railway | deploy render"))
			return
		}
		deploy(args[1], cfg)

	case "destroy":
		if len(args) < 2 {
			fmt.Println(red("❌ Specify a cloud: destroy vercel | destroy railway | destroy render"))
			return
		}
		destroy(args[1])

	case "status":
		cmdStatus(cfg)

	case "watchdog":
		cmdWatchdog(cfg)

	case "help", "--help", "-h":
		cmdHelp()

	default:
		fmt.Printf("%s '%s'\n", red("❌ Unknown command:"), args[0])
		cmdHelp()
	}
}