// notifier/main.go
// Watches your GitHub Actions CI/CD pipeline
// Polls every 30 seconds and tells you when a deploy passes or fails
// Run: GITHUB_TOKEN=xxx GITHUB_REPO=vipuljain675/india-deals-tracker go run main.go

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// GitHub Actions API response structures
type WorkflowRun struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Status     string `json:"status"`     // "queued", "in_progress", "completed"
	Conclusion string `json:"conclusion"` // "success", "failure", "cancelled"
	HeadBranch string `json:"head_branch"`
	HeadSHA    string `json:"head_sha"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
	HTMLURL    string `json:"html_url"`
}

type WorkflowRunsResponse struct {
	WorkflowRuns []WorkflowRun `json:"workflow_runs"`
}

type Commit struct {
	SHA    string `json:"sha"`
	Commit struct {
		Message string `json:"message"`
		Author  struct {
			Name string `json:"name"`
		} `json:"author"`
	} `json:"commit"`
}

func getLatestRuns(repo, token string) ([]WorkflowRun, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/actions/runs?per_page=5", repo)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result WorkflowRunsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.WorkflowRuns, nil
}

func statusIcon(status, conclusion string) string {
	if status == "in_progress" || status == "queued" {
		return "⏳"
	}
	switch conclusion {
	case "success":
		return "✅"
	case "failure":
		return "❌"
	case "cancelled":
		return "⚠️"
	default:
		return "❓"
	}
}

func shortSHA(sha string) string {
	if len(sha) > 7 {
		return sha[:7]
	}
	return sha
}

func main() {
	token := os.Getenv("GITHUB_TOKEN")
	repo := os.Getenv("GITHUB_REPO")

	if token == "" || repo == "" {
		fmt.Println("❌ Required env vars:")
		fmt.Println("   export GITHUB_TOKEN='ghp_your_token_here'")
		fmt.Println("   export GITHUB_REPO='vipuljain675/india-deals-tracker'")
		fmt.Println("\nGet token: github.com → Settings → Developer settings → Personal access tokens")
		os.Exit(1)
	}

	fmt.Printf("🚀 Deployment Watcher — India Deals Tracker\n")
	fmt.Printf("📦 Repo   : %s\n", repo)
	fmt.Printf("🔄 Polling every 30 seconds\n\n")

	// Track last seen run ID to detect new deploys
	lastSeenID := int64(0)

	for {
		runs, err := getLatestRuns(repo, token)
		if err != nil {
			fmt.Printf("[%s] ❌ API error: %v\n", time.Now().Format("15:04:05"), err)
			time.Sleep(30 * time.Second)
			continue
		}

		if len(runs) == 0 {
			fmt.Printf("[%s] No workflow runs found\n", time.Now().Format("15:04:05"))
			time.Sleep(30 * time.Second)
			continue
		}

		latest := runs[0]

		// First run — just print current state
		if lastSeenID == 0 {
			fmt.Printf("[%s] Current state:\n", time.Now().Format("15:04:05"))
			for _, run := range runs {
				fmt.Printf("  %s #%d %-12s %-10s [%s] %s\n",
					statusIcon(run.Status, run.Conclusion),
					run.ID,
					run.Status,
					run.Conclusion,
					shortSHA(run.HeadSHA),
					run.HeadBranch,
				)
			}
			fmt.Println()
			lastSeenID = latest.ID
			time.Sleep(30 * time.Second)
			continue
		}

		// New run detected
		if latest.ID != lastSeenID {
			fmt.Printf("\n🔔 NEW DEPLOYMENT DETECTED!\n")
			fmt.Printf("   Branch  : %s\n", latest.HeadBranch)
			fmt.Printf("   Commit  : %s\n", shortSHA(latest.HeadSHA))
			fmt.Printf("   Status  : %s\n", latest.Status)
			fmt.Printf("   URL     : %s\n\n", latest.HTMLURL)
			lastSeenID = latest.ID
		}

		// Show status of latest run
		icon := statusIcon(latest.Status, latest.Conclusion)
		timestamp := time.Now().Format("15:04:05")

		if latest.Status == "in_progress" {
			fmt.Printf("[%s] %s DEPLOYING... (commit %s on %s)\n",
				timestamp, icon, shortSHA(latest.HeadSHA), latest.HeadBranch)

		} else if latest.Status == "completed" {
			switch latest.Conclusion {
			case "success":
				fmt.Printf("[%s] %s DEPLOYED SUCCESSFULLY! commit %s → live on Vercel 🎉\n",
					timestamp, icon, shortSHA(latest.HeadSHA))
			case "failure":
				fmt.Printf("[%s] %s DEPLOYMENT FAILED! commit %s\n",
					timestamp, icon, shortSHA(latest.HeadSHA))
				fmt.Printf("   🔗 Check logs: %s\n", latest.HTMLURL)
			case "cancelled":
				fmt.Printf("[%s] %s Deployment cancelled (commit %s)\n",
					timestamp, icon, shortSHA(latest.HeadSHA))
			}
		} else {
			fmt.Printf("[%s] ⏳ Queued... (commit %s)\n",
				timestamp, shortSHA(latest.HeadSHA))
		}

		time.Sleep(30 * time.Second)
	}
}