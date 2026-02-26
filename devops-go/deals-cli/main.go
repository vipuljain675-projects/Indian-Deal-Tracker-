// deals-cli/main.go
// A command line tool to manage your India Deals Tracker
// without opening the browser
//
// Setup:
//   export BASE_URL="https://indian-deal-tracker.vercel.app"
//   export CRON_SECRET="mySuperSecret123"
//
// Commands:
//   go run main.go stats              → show DB overview
//   go run main.go pending            → list deals waiting for approval
//   go run main.go approve <id>       → approve a deal
//   go run main.go reject <id>        → reject a deal
//   go run main.go search <keyword>   → search deals
//   go run main.go top                → top 5 deals by value

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

// ── Data structures — match your MongoDB deal shape ──

type Deal struct {
	ID           string   `json:"_id"`
	Title        string   `json:"title"`
	Country      string   `json:"country"`
	Value        string   `json:"value"`
	Status       string   `json:"status"`
	Type         string   `json:"type"`
	Impact       string   `json:"impact"`
	Description  string   `json:"description"`
	Date         string   `json:"date"`
	ReviewStatus string   `json:"reviewStatus"`
	KeyItems     []string `json:"keyItems"`
	CreatedAt    string   `json:"createdAt"`
}

type HealthResponse struct {
	Status        string `json:"status"`
	ApprovedDeals int    `json:"approvedDeals"`
	Timestamp     string `json:"timestamp"`
}

// ── HTTP helpers ──

func get(baseURL, path string) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(baseURL + path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func patch(baseURL, path, secret string, body string) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("PATCH", baseURL+path, strings.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-cron-secret", secret)
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// ── Value parser ──

func parseValue(v string) float64 {
	v = strings.ReplaceAll(v, "B", "")
	v = strings.ReplaceAll(v, "b", "")
	v = strings.TrimSpace(v)
	f, _ := strconv.ParseFloat(v, 64)
	return f
}

// ── Colour helpers (terminal colours) ──

func green(s string) string  { return "\033[32m" + s + "\033[0m" }
func red(s string) string    { return "\033[31m" + s + "\033[0m" }
func yellow(s string) string { return "\033[33m" + s + "\033[0m" }
func bold(s string) string   { return "\033[1m" + s + "\033[0m" }
func cyan(s string) string   { return "\033[36m" + s + "\033[0m" }
func grey(s string) string   { return "\033[90m" + s + "\033[0m" }

func impactColour(impact string) string {
	switch impact {
	case "High Impact":
		return red("● High")
	case "Medium Impact":
		return yellow("● Medium")
	default:
		return green("● Low")
	}
}

func statusColour(status string) string {
	switch status {
	case "Completed":
		return green(status)
	case "In Progress":
		return cyan(status)
	case "Proposed":
		return yellow(status)
	case "Signed":
		return bold(status)
	default:
		return status
	}
}

// ── Commands ──

// stats: show a quick overview of the database
func cmdStats(baseURL string) {
	fmt.Println(bold("\n🇮🇳 India Deals Tracker — Live Stats"))
	fmt.Println(strings.Repeat("─", 45))

	// Health check
	body, err := get(baseURL, "/api/health")
	if err != nil {
		fmt.Println(red("❌ Cannot reach server: " + err.Error()))
		return
	}
	var health HealthResponse
	json.Unmarshal(body, &health)

	if health.Status == "healthy" {
		fmt.Printf("Server        %s\n", green("● HEALTHY"))
	} else {
		fmt.Printf("Server        %s\n", red("● DOWN"))
	}
	fmt.Printf("Approved      %s deals\n", bold(strconv.Itoa(health.ApprovedDeals)))

	// All deals
	body, err = get(baseURL, "/api/deals")
	if err != nil {
		fmt.Println(red("❌ Cannot fetch deals"))
		return
	}
	var deals []Deal
	json.Unmarshal(body, &deals)

	// Compute stats
	pending := 0
	approved := 0
	totalValue := 0.0
	countryMap := map[string]int{}
	typeMap := map[string]int{}

	for _, d := range deals {
		if d.ReviewStatus == "pending" {
			pending++
		}
		if d.ReviewStatus == "approved" {
			approved++
			totalValue += parseValue(d.Value)
			countryMap[d.Country]++
			typeMap[d.Type]++
		}
	}

	fmt.Printf("Pending       %s deals waiting for your review\n",
		yellow(strconv.Itoa(pending)))
	fmt.Printf("Total value   %s\n", bold(fmt.Sprintf("$%.1fB", totalValue)))

	// Top 3 countries
	type kv struct{ k string; v int }
	var countries []kv
	for k, v := range countryMap {
		countries = append(countries, kv{k, v})
	}
	sort.Slice(countries, func(i, j int) bool { return countries[i].v > countries[j].v })

	fmt.Println(strings.Repeat("─", 45))
	fmt.Println(bold("Top Partners"))
	for i, c := range countries {
		if i >= 3 {
			break
		}
		bar := strings.Repeat("█", c.v/2)
		fmt.Printf("  %-15s %s %d\n", c.k, cyan(bar), c.v)
	}

	fmt.Println(strings.Repeat("─", 45))
	fmt.Println(bold("Deal Types"))
	for t, count := range typeMap {
		pct := float64(count) / float64(approved) * 100
		fmt.Printf("  %-25s %d (%.0f%%)\n", t, count, pct)
	}

	fmt.Printf("\n%s\n\n", grey("Updated: "+time.Now().Format("2006-01-02 15:04:05")))
}

// pending: list all deals waiting for approval
func cmdPending(baseURL string) {
	body, err := get(baseURL, "/api/deals")
	if err != nil {
		fmt.Println(red("❌ Cannot fetch deals: " + err.Error()))
		return
	}

	var deals []Deal
	json.Unmarshal(body, &deals)

	var pending []Deal
	for _, d := range deals {
		if d.ReviewStatus == "pending" {
			pending = append(pending, d)
		}
	}

	if len(pending) == 0 {
		fmt.Println(green("\n✅ No pending deals — queue is empty!\n"))
		return
	}

	fmt.Printf("\n%s\n", bold(fmt.Sprintf("📋 %d deals waiting for review:", len(pending))))
	fmt.Println(strings.Repeat("─", 70))

	for i, d := range pending {
		value := "N/A"
		if d.Value != "" && d.Value != "0" {
			value = "$" + d.Value + "B"
		}
		fmt.Printf("\n%s  %s\n", bold(fmt.Sprintf("[%d]", i+1)), bold(d.Title))
		fmt.Printf("    ID      : %s\n", grey(d.ID))
		fmt.Printf("    Country : %s\n", d.Country)
		fmt.Printf("    Value   : %s\n", cyan(value))
		fmt.Printf("    Type    : %s\n", d.Type)
		fmt.Printf("    Impact  : %s\n", impactColour(d.Impact))
		fmt.Printf("    Status  : %s\n", statusColour(d.Status))
		if d.Description != "" {
			desc := d.Description
			if len(desc) > 120 {
				desc = desc[:120] + "..."
			}
			fmt.Printf("    Desc    : %s\n", grey(desc))
		}
		fmt.Println()

		// Show approve/reject hint for each deal
		fmt.Printf("    %s  |  %s\n",
			green("approve: go run main.go approve "+d.ID[:8]+"..."),
			red("reject:  go run main.go reject "+d.ID[:8]+"..."),
		)
	}

	fmt.Println(strings.Repeat("─", 70))
	fmt.Printf("\n%s\n\n", grey("Tip: copy the full ID from above to approve/reject"))
}

// approve: approve a deal by ID
func cmdApprove(baseURL, secret, id string) {
	if id == "" {
		fmt.Println(red("❌ Please provide a deal ID"))
		fmt.Println(grey("   Example: go run main.go approve 65abc123def456"))
		return
	}

	fmt.Printf("Approving deal %s...\n", cyan(id))

	body := fmt.Sprintf(`{"id": "%s", "action": "approve"}`, id)
	resp, err := patch(baseURL, "/api/admin/review", secret, body)
	if err != nil {
		fmt.Println(red("❌ Failed: " + err.Error()))
		return
	}

	// Check response
	var result map[string]interface{}
	json.Unmarshal(resp, &result)

	if _, ok := result["error"]; ok {
		fmt.Printf("%s %v\n", red("❌ Error:"), result["error"])
	} else {
		fmt.Println(green("✅ Deal approved! It's now live on the dashboard."))
	}
}

// reject: reject a deal by ID
func cmdReject(baseURL, secret, id string) {
	if id == "" {
		fmt.Println(red("❌ Please provide a deal ID"))
		fmt.Println(grey("   Example: go run main.go reject 65abc123def456"))
		return
	}

	fmt.Printf("Rejecting deal %s...\n", yellow(id))

	body := fmt.Sprintf(`{"id": "%s", "action": "reject"}`, id)
	resp, err := patch(baseURL, "/api/admin/review", secret, body)
	if err != nil {
		fmt.Println(red("❌ Failed: " + err.Error()))
		return
	}

	var result map[string]interface{}
	json.Unmarshal(resp, &result)

	if _, ok := result["error"]; ok {
		fmt.Printf("%s %v\n", red("❌ Error:"), result["error"])
	} else {
		fmt.Println(yellow("🗑️  Deal rejected and removed from queue."))
	}
}

// search: search approved deals by keyword
func cmdSearch(baseURL, keyword string) {
	if keyword == "" {
		fmt.Println(red("❌ Please provide a search keyword"))
		fmt.Println(grey("   Example: go run main.go search rafale"))
		return
	}

	body, err := get(baseURL, "/api/deals")
	if err != nil {
		fmt.Println(red("❌ Cannot fetch deals: " + err.Error()))
		return
	}

	var deals []Deal
	json.Unmarshal(body, &deals)

	keyword = strings.ToLower(keyword)
	var results []Deal
	for _, d := range deals {
		if d.ReviewStatus != "approved" {
			continue
		}
		haystack := strings.ToLower(d.Title + d.Country + d.Type + d.Description)
		if strings.Contains(haystack, keyword) {
			results = append(results, d)
		}
	}

	if len(results) == 0 {
		fmt.Printf("\n%s\n\n", yellow("No deals found matching: "+keyword))
		return
	}

	fmt.Printf("\n%s\n", bold(fmt.Sprintf("🔍 %d deals matching \"%s\":", len(results), keyword)))
	fmt.Println(strings.Repeat("─", 65))

	for _, d := range results {
		value := "N/A"
		if d.Value != "" && d.Value != "0" {
			value = "$" + d.Value + "B"
		}
		year := ""
		if len(d.Date) >= 4 {
			year = d.Date[len(d.Date)-4:]
		}
		fmt.Printf("\n  %s\n", bold(d.Title))
		fmt.Printf("  %s · %s · %s · %s\n",
			cyan(d.Country),
			bold(value),
			statusColour(d.Status),
			grey(year),
		)
		if d.Description != "" {
			desc := d.Description
			if len(desc) > 100 {
				desc = desc[:100] + "..."
			}
			fmt.Printf("  %s\n", grey(desc))
		}
	}
	fmt.Println()
}

// top: show top 5 deals by value
func cmdTop(baseURL string) {
	body, err := get(baseURL, "/api/deals")
	if err != nil {
		fmt.Println(red("❌ Cannot fetch deals: " + err.Error()))
		return
	}

	var deals []Deal
	json.Unmarshal(body, &deals)

	// Filter approved and sort by value
	var approved []Deal
	for _, d := range deals {
		if d.ReviewStatus == "approved" && parseValue(d.Value) > 0 {
			approved = append(approved, d)
		}
	}

	sort.Slice(approved, func(i, j int) bool {
		return parseValue(approved[i].Value) > parseValue(approved[j].Value)
	})

	fmt.Printf("\n%s\n", bold("💰 Top 10 Deals by Value"))
	fmt.Println(strings.Repeat("─", 65))

	medals := []string{"🥇", "🥈", "🥉", "4️⃣ ", "5️⃣ ", "6️⃣ ", "7️⃣ ", "8️⃣ ", "9️⃣ ", "🔟"}
	for i, d := range approved {
		if i >= 10 {
			break
		}
		fmt.Printf("\n%s %s\n", medals[i], bold(d.Title))
		fmt.Printf("   %s · %s · %s\n",
			cyan(d.Country),
			bold("$"+d.Value+"B"),
			statusColour(d.Status),
		)
	}
	fmt.Println()
}

// help: show available commands
func cmdHelp() {
	fmt.Println(bold("\n🇮🇳 India Deals Tracker CLI"))
	fmt.Println(grey("Manage your deals from the terminal\n"))
	fmt.Println(bold("Usage:"))
	fmt.Println("  go run main.go <command> [arguments]\n")
	fmt.Println(bold("Commands:"))
	cmds := [][]string{
		{"stats", "", "Show live database overview"},
		{"pending", "", "List all deals waiting for review"},
		{"approve", "<deal-id>", "Approve a pending deal → goes live"},
		{"reject", "<deal-id>", "Reject a pending deal → removed"},
		{"search", "<keyword>", "Search deals by keyword"},
		{"top", "", "Show top 10 deals by value"},
		{"help", "", "Show this help message"},
	}
	for _, cmd := range cmds {
		fmt.Printf("  %-10s %-20s %s\n", cyan(cmd[0]), grey(cmd[1]), cmd[2])
	}
	fmt.Println(bold("\nSetup:"))
	fmt.Println(grey("  export BASE_URL=\"https://indian-deal-tracker.vercel.app\""))
	fmt.Println(grey("  export CRON_SECRET=\"mySuperSecret123\""))
	fmt.Println()
}

// ── Main entry point ──

func main() {
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://indian-deal-tracker.vercel.app"
	}
	secret := os.Getenv("CRON_SECRET")

	// Get command from arguments
	args := os.Args[1:] // os.Args[0] is the program name itself
	if len(args) == 0 {
		cmdHelp()
		return
	}

	command := args[0]
	argument := ""
	if len(args) > 1 {
		argument = strings.Join(args[1:], " ")
	}

	// Route to the right function
	switch command {
	case "stats":
		cmdStats(baseURL)
	case "pending":
		cmdPending(baseURL)
	case "approve":
		cmdApprove(baseURL, secret, argument)
	case "reject":
		cmdReject(baseURL, secret, argument)
	case "search":
		cmdSearch(baseURL, argument)
	case "top":
		cmdTop(baseURL)
	case "help", "--help", "-h":
		cmdHelp()
	default:
		fmt.Printf("\n%s '%s'\n", red("❌ Unknown command:"), command)
		cmdHelp()
	}
}