// monitor/main.go
// Checks your India Deals Tracker every 60 seconds
// Alerts you via console (can extend to email/Telegram)
// Run: go run main.go

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// HealthResponse matches what your /api/health returns
type HealthResponse struct {
	Status        string `json:"status"`
	ApprovedDeals int    `json:"approvedDeals"`
	Timestamp     string `json:"timestamp"`
}

// CheckResult stores the result of one health check
type CheckResult struct {
	Time         time.Time
	Status       string // "UP" or "DOWN"
	ResponseMS   int64
	ApprovedDeals int
	Error        string
}

func checkHealth(url string) CheckResult {
	start := time.Now()

	// Make HTTP request with 10 second timeout
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		return CheckResult{
			Time:       time.Now(),
			Status:     "DOWN",
			ResponseMS: elapsed,
			Error:      err.Error(),
		}
	}
	defer resp.Body.Close()

	// Parse the JSON response
	var health HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		return CheckResult{
			Time:       time.Now(),
			Status:     "DOWN",
			ResponseMS: elapsed,
			Error:      "Could not parse response: " + err.Error(),
		}
	}

	status := "UP"
	if health.Status != "healthy" || resp.StatusCode != 200 {
		status = "DOWN"
	}

	return CheckResult{
		Time:          time.Now(),
		Status:        status,
		ResponseMS:    elapsed,
		ApprovedDeals: health.ApprovedDeals,
	}
}

func main() {
	// Get URL from env or use default
	url := os.Getenv("HEALTH_URL")
	if url == "" {
		url = "https://indian-deal-tracker.vercel.app/api/health"
	}

	interval := 60 * time.Second // check every 60 seconds
	consecutiveFailures := 0
	totalChecks := 0
	totalUptime := 0

	fmt.Printf("🚀 India Deals Tracker Monitor\n")
	fmt.Printf("📡 Watching: %s\n", url)
	fmt.Printf("⏱️  Interval: every %s\n\n", interval)

	for {
		result := checkHealth(url)
		totalChecks++

		if result.Status == "UP" {
			totalUptime++
			consecutiveFailures = 0
			uptimePct := float64(totalUptime) / float64(totalChecks) * 100

			fmt.Printf("[%s] ✅ UP  | %dms | %d deals | Uptime: %.1f%%\n",
				result.Time.Format("2006-01-02 15:04:05"),
				result.ResponseMS,
				result.ApprovedDeals,
				uptimePct,
			)

			// Warn if response is slow (over 3 seconds)
			if result.ResponseMS > 3000 {
				fmt.Printf("  ⚠️  SLOW RESPONSE: %dms (threshold: 3000ms)\n", result.ResponseMS)
			}

		} else {
			consecutiveFailures++
			fmt.Printf("[%s] ❌ DOWN | Error: %s\n",
				result.Time.Format("2006-01-02 15:04:05"),
				result.Error,
			)

			// Alert after 3 consecutive failures
			if consecutiveFailures >= 3 {
				fmt.Printf("\n🚨 ALERT: Site has been DOWN for %d consecutive checks!\n", consecutiveFailures)
				fmt.Printf("🔗 Check manually: %s\n\n", url)
				// TODO: Add email/Telegram notification here
			}
		}

		time.Sleep(interval)
	}
}