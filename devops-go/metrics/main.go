// metrics/main.go
// Records your app's health every 5 minutes into a CSV file
// After collecting data, shows you trends and analysis
//
// Run collector:  go run main.go collect
// See report:     go run main.go report
// See today:      go run main.go today

package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

// ── Data structures ──

type Metric struct {
	Timestamp     time.Time
	ResponseMS    int64
	Status        string // "healthy" or "down"
	ApprovedDeals int
	HTTPCode      int
}

type HealthResponse struct {
	Status        string `json:"status"`
	ApprovedDeals int    `json:"approvedDeals"`
}

// ── Colours ──

func green(s string) string  { return "\033[32m" + s + "\033[0m" }
func red(s string) string    { return "\033[31m" + s + "\033[0m" }
func yellow(s string) string { return "\033[33m" + s + "\033[0m" }
func bold(s string) string   { return "\033[1m" + s + "\033[0m" }
func cyan(s string) string   { return "\033[36m" + s + "\033[0m" }
func grey(s string) string   { return "\033[90m" + s + "\033[0m" }

// ── CSV file operations ──

const csvFile = "metrics.csv"

func saveMetric(m Metric) error {
	// Open file in append mode, create if doesn't exist
	f, err := os.OpenFile(csvFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	// Write header if file is new (size = 0)
	info, _ := f.Stat()
	if info.Size() == 0 {
		w.Write([]string{"timestamp", "response_ms", "status", "approved_deals", "http_code"})
	}

	return w.Write([]string{
		m.Timestamp.Format(time.RFC3339),
		strconv.FormatInt(m.ResponseMS, 10),
		m.Status,
		strconv.Itoa(m.ApprovedDeals),
		strconv.Itoa(m.HTTPCode),
	})
}

func loadMetrics() ([]Metric, error) {
	f, err := os.Open(csvFile)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}

	var metrics []Metric
	for i, row := range records {
		if i == 0 {
			continue // skip header
		}
		if len(row) < 5 {
			continue
		}
		t, _ := time.Parse(time.RFC3339, row[0])
		ms, _ := strconv.ParseInt(row[1], 10, 64)
		deals, _ := strconv.Atoi(row[3])
		code, _ := strconv.Atoi(row[4])

		metrics = append(metrics, Metric{
			Timestamp:     t,
			ResponseMS:    ms,
			Status:        row[2],
			ApprovedDeals: deals,
			HTTPCode:      code,
		})
	}
	return metrics, nil
}

// ── Health check ──

func checkHealth(url string) Metric {
	start := time.Now()
	client := &http.Client{Timeout: 10 * time.Second}

	resp, err := client.Get(url)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		return Metric{
			Timestamp:  time.Now(),
			ResponseMS: elapsed,
			Status:     "down",
			HTTPCode:   0,
		}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var health HealthResponse
	json.Unmarshal(body, &health)

	status := "healthy"
	if health.Status != "healthy" || resp.StatusCode != 200 {
		status = "down"
	}

	return Metric{
		Timestamp:     time.Now(),
		ResponseMS:    elapsed,
		Status:        status,
		ApprovedDeals: health.ApprovedDeals,
		HTTPCode:      resp.StatusCode,
	}
}

// ── Commands ──

// collect: run forever, record metric every 5 minutes
func cmdCollect(url string) {
	interval := 5 * time.Minute
	fmt.Printf("%s\n", bold("📊 Metrics Collector — India Deals Tracker"))
	fmt.Printf("📡 Watching : %s\n", url)
	fmt.Printf("💾 Saving to: %s\n", csvFile)
	fmt.Printf("⏱️  Interval : every 5 minutes\n\n")
	fmt.Println(grey("Press Ctrl+C to stop\n"))

	checkCount := 0

	for {
		m := checkHealth(url)
		checkCount++

		// Save to CSV
		if err := saveMetric(m); err != nil {
			fmt.Printf("[%s] ❌ Failed to save: %v\n",
				m.Timestamp.Format("15:04:05"), err)
		}

		// Print to terminal
		statusIcon := green("✅ UP  ")
		if m.Status == "down" {
			statusIcon = red("❌ DOWN")
		}

		speedLabel := green("fast")
		if m.ResponseMS > 1000 {
			speedLabel = yellow("slow")
		}
		if m.ResponseMS > 3000 {
			speedLabel = red("very slow")
		}

		fmt.Printf("[%s] %s | %s%dms | %d deals | Check #%d\n",
			m.Timestamp.Format("2006-01-02 15:04:05"),
			statusIcon,
			grey(speedLabel+" "),
			m.ResponseMS,
			m.ApprovedDeals,
			checkCount,
		)

		time.Sleep(interval)
	}
}

// report: analyse all saved metrics and show trends
func cmdReport() {
	metrics, err := loadMetrics()
	if err != nil {
		fmt.Printf("%s\n", red("❌ No metrics file found. Run 'collect' first."))
		fmt.Println(grey("   go run main.go collect"))
		return
	}

	if len(metrics) == 0 {
		fmt.Println(yellow("No data yet. Let the collector run for a while first."))
		return
	}

	fmt.Printf("\n%s\n", bold("📊 Metrics Report — India Deals Tracker"))
	fmt.Printf("%s\n\n", grey(fmt.Sprintf("Based on %d data points", len(metrics))))

	// ── Overall stats ──
	totalMS := int64(0)
	minMS := int64(math.MaxInt64)
	maxMS := int64(0)
	downCount := 0
	var responseTimes []float64

	for _, m := range metrics {
		totalMS += m.ResponseMS
		responseTimes = append(responseTimes, float64(m.ResponseMS))
		if m.ResponseMS < minMS {
			minMS = m.ResponseMS
		}
		if m.ResponseMS > maxMS {
			maxMS = m.ResponseMS
		}
		if m.Status == "down" {
			downCount++
		}
	}

	avgMS := totalMS / int64(len(metrics))
	uptime := float64(len(metrics)-downCount) / float64(len(metrics)) * 100

	// Calculate p95 (95th percentile — "worst case" response time)
	sort.Float64s(responseTimes)
	p95idx := int(float64(len(responseTimes)) * 0.95)
	p95 := responseTimes[p95idx]

	fmt.Println(bold("📈 OVERALL PERFORMANCE"))
	fmt.Println(strings.Repeat("─", 45))
	fmt.Printf("  Uptime          %s\n", bold(fmt.Sprintf("%.2f%%", uptime)))
	fmt.Printf("  Avg response    %s\n", formatMS(avgMS))
	fmt.Printf("  Fastest         %s\n", green(fmt.Sprintf("%dms", minMS)))
	fmt.Printf("  Slowest         %s\n", formatMSSlow(maxMS))
	fmt.Printf("  P95 response    %s\n", formatMSSlow(int64(p95)))
	fmt.Printf("  Total downtime  %s\n", red(fmt.Sprintf("%d checks down", downCount)))
	fmt.Printf("  Data collected  %s to %s\n",
		grey(metrics[0].Timestamp.Format("Jan 2")),
		grey(metrics[len(metrics)-1].Timestamp.Format("Jan 2 15:04")),
	)

	// ── Hourly breakdown ──
	fmt.Printf("\n%s\n", bold("🕐 RESPONSE TIME BY HOUR (avg)"))
	fmt.Println(strings.Repeat("─", 45))
	hourlyMS := map[int][]int64{}
	for _, m := range metrics {
		h := m.Timestamp.Hour()
		hourlyMS[h] = append(hourlyMS[h], m.ResponseMS)
	}

	for h := 0; h < 24; h++ {
		data, ok := hourlyMS[h]
		if !ok {
			continue
		}
		sum := int64(0)
		for _, v := range data {
			sum += v
		}
		avg := sum / int64(len(data))
		bar := strings.Repeat("█", int(avg/50))
		timeLabel := fmt.Sprintf("%02d:00", h)
		fmt.Printf("  %s  %s %s\n", cyan(timeLabel), bar, grey(fmt.Sprintf("%dms", avg)))
	}

	// ── Deal count trend ──
	fmt.Printf("\n%s\n", bold("📦 DEAL COUNT OVER TIME"))
	fmt.Println(strings.Repeat("─", 45))

	// Group by day
	dayDeals := map[string]int{}
	for _, m := range metrics {
		day := m.Timestamp.Format("Jan 02")
		if m.ApprovedDeals > dayDeals[day] {
			dayDeals[day] = m.ApprovedDeals
		}
	}
	// Sort days
	var days []string
	for d := range dayDeals {
		days = append(days, d)
	}
	sort.Strings(days)
	for _, d := range days {
		fmt.Printf("  %s  %s deals\n", cyan(d), bold(strconv.Itoa(dayDeals[d])))
	}

	// ── Slowest periods ──
	fmt.Printf("\n%s\n", bold("🐢 SLOWEST RESPONSES (top 5)"))
	fmt.Println(strings.Repeat("─", 45))
	sort.Slice(metrics, func(i, j int) bool {
		return metrics[i].ResponseMS > metrics[j].ResponseMS
	})
	for i, m := range metrics {
		if i >= 5 {
			break
		}
		fmt.Printf("  %s  %s  %s\n",
			red(fmt.Sprintf("%dms", m.ResponseMS)),
			grey(m.Timestamp.Format("Jan 02 15:04")),
			grey(m.Status),
		)
	}

	fmt.Printf("\n%s\n\n", grey("Tip: run 'go run main.go today' for just today's data"))
}

// today: show only today's metrics
func cmdToday(url string) {
	metrics, err := loadMetrics()
	if err != nil {
		fmt.Println(red("❌ No metrics file. Run 'collect' first."))
		return
	}

	today := time.Now().Format("2006-01-02")
	var todayMetrics []Metric
	for _, m := range metrics {
		if m.Timestamp.Format("2006-01-02") == today {
			todayMetrics = append(todayMetrics, m)
		}
	}

	if len(todayMetrics) == 0 {
		fmt.Println(yellow("No data for today yet. Collector needs to be running."))
		return
	}

	fmt.Printf("\n%s\n", bold("📅 Today's Metrics — "+today))
	fmt.Println(strings.Repeat("─", 55))

	downCount := 0
	totalMS := int64(0)
	for _, m := range todayMetrics {
		statusIcon := green("✅")
		if m.Status == "down" {
			statusIcon = red("❌")
			downCount++
		}
		fmt.Printf("  %s %s  %s  %d deals\n",
			statusIcon,
			grey(m.Timestamp.Format("15:04")),
			formatMS(m.ResponseMS),
			m.ApprovedDeals,
		)
		totalMS += m.ResponseMS
	}

	avg := totalMS / int64(len(todayMetrics))
	uptime := float64(len(todayMetrics)-downCount) / float64(len(todayMetrics)) * 100

	fmt.Println(strings.Repeat("─", 55))
	fmt.Printf("  Checks: %d  |  Avg: %s  |  Uptime: %s\n\n",
		len(todayMetrics),
		formatMS(avg),
		bold(fmt.Sprintf("%.1f%%", uptime)),
	)
}

// helper: colour-code response time
func formatMS(ms int64) string {
	s := fmt.Sprintf("%dms", ms)
	if ms < 500 {
		return green(s)
	} else if ms < 1500 {
		return yellow(s)
	}
	return red(s)
}

func formatMSSlow(ms int64) string {
	s := fmt.Sprintf("%dms", ms)
	if ms > 3000 {
		return red(s)
	} else if ms > 1000 {
		return yellow(s)
	}
	return s
}

func cmdHelp() {
	fmt.Println(bold("\n📊 Deals Metrics Collector"))
	fmt.Println(grey("Track your app performance over time\n"))
	fmt.Println(bold("Commands:"))
	fmt.Printf("  %s   Run forever, record metric every 5 min\n", cyan("collect"))
	fmt.Printf("  %s    Show full analysis of all collected data\n", cyan("report"))
	fmt.Printf("  %s     Show only today's metrics\n", cyan("today"))
	fmt.Println(bold("\nSetup:"))
	fmt.Println(grey("  export HEALTH_URL=\"https://indian-deal-tracker.vercel.app/api/health\""))
	fmt.Println()
}

// ── Main ──

func main() {
	url := os.Getenv("HEALTH_URL")
	if url == "" {
		url = "https://indian-deal-tracker.vercel.app/api/health"
	}

	args := os.Args[1:]
	if len(args) == 0 {
		cmdHelp()
		return
	}

	switch args[0] {
	case "collect":
		cmdCollect(url)
	case "report":
		cmdReport()
	case "today":
		cmdToday(url)
	case "help", "--help", "-h":
		cmdHelp()
	default:
		fmt.Printf("%s '%s'\n", red("❌ Unknown command:"), args[0])
		cmdHelp()
	}
}