// dbstats/main.go
// Connects to your MongoDB Atlas and prints live database statistics
// Run: MONGODB_URI="your_uri" go run main.go

package main

import (
	"context"
	"fmt"
	"os"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Deal matches your MongoDB deal document structure
type Deal struct {
	Title        string  `bson:"title"`
	Country      string  `bson:"country"`
	Value        string  `bson:"value"`
	Status       string  `bson:"status"`
	Type         string  `bson:"type"`
	Impact       string  `bson:"impact"`
	ReviewStatus string  `bson:"reviewStatus"`
	Date         string  `bson:"date"`
}

func main() {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		fmt.Println("❌ Set MONGODB_URI environment variable first")
		fmt.Println("   export MONGODB_URI='mongodb+srv://...'")
		os.Exit(1)
	}

	fmt.Println("🔌 Connecting to MongoDB Atlas...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		fmt.Printf("❌ Connection failed: %v\n", err)
		os.Exit(1)
	}
	defer client.Disconnect(ctx)

	// Ping to confirm connection
	if err := client.Ping(ctx, nil); err != nil {
		fmt.Printf("❌ Ping failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ Connected!\n")

	db := client.Database("finbank")
	collection := db.Collection("deals")

	// Fetch all deals
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		fmt.Printf("❌ Query failed: %v\n", err)
		os.Exit(1)
	}
	defer cursor.Close(ctx)

	var deals []Deal
	if err := cursor.All(ctx, &deals); err != nil {
		fmt.Printf("❌ Decode failed: %v\n", err)
		os.Exit(1)
	}

	// ── Compute stats ──

	// Review status counts
	statusCount := map[string]int{}
	for _, d := range deals {
		statusCount[d.ReviewStatus]++
	}

	// Country breakdown (approved only)
	countryCount := map[string]int{}
	typeCount := map[string]int{}
	impactCount := map[string]int{}
	totalValue := 0.0
	approvedDeals := 0

	for _, d := range deals {
		if d.ReviewStatus != "approved" {
			continue
		}
		approvedDeals++
		countryCount[d.Country]++
		typeCount[d.Type]++
		impactCount[d.Impact]++

		// Parse value
		val := 0.0
		fmt.Sscanf(d.Value, "%f", &val)
		totalValue += val
	}

	// Sort countries by count
	type kv struct {
		Key   string
		Value int
	}
	var sortedCountries []kv
	for k, v := range countryCount {
		sortedCountries = append(sortedCountries, kv{k, v})
	}
	sort.Slice(sortedCountries, func(i, j int) bool {
		return sortedCountries[i].Value > sortedCountries[j].Value
	})

	// ── Print report ──
	fmt.Printf("╔══════════════════════════════════════════╗\n")
	fmt.Printf("║     🇮🇳 India Deals Tracker — DB Stats    ║\n")
	fmt.Printf("╚══════════════════════════════════════════╝\n\n")

	fmt.Printf("📊 OVERVIEW\n")
	fmt.Printf("   Total documents in DB : %d\n", len(deals))
	fmt.Printf("   Approved deals        : %d\n", statusCount["approved"])
	fmt.Printf("   Pending review        : %d\n", statusCount["pending"])
	fmt.Printf("   Rejected              : %d\n", statusCount["rejected"])
	fmt.Printf("   Total estimated value : $%.1fB\n\n", totalValue)

	fmt.Printf("🌍 TOP 10 PARTNER COUNTRIES\n")
	for i, kv := range sortedCountries {
		if i >= 10 {
			break
		}
		bar := ""
		for j := 0; j < kv.Value; j++ {
			bar += "█"
		}
		fmt.Printf("   %-20s %s %d\n", kv.Key, bar, kv.Value)
	}

	fmt.Printf("\n📦 DEAL TYPES\n")
	for t, count := range typeCount {
		pct := float64(count) / float64(approvedDeals) * 100
		fmt.Printf("   %-25s %d deals (%.0f%%)\n", t, count, pct)
	}

	fmt.Printf("\n⚡ IMPACT LEVELS\n")
	for impact, count := range impactCount {
		icon := "🟢"
		if impact == "High Impact" {
			icon = "🔴"
		} else if impact == "Medium Impact" {
			icon = "🟡"
		}
		fmt.Printf("   %s %-20s %d deals\n", icon, impact, count)
	}

	fmt.Printf("\n⏰ Report generated: %s\n", time.Now().Format("2006-01-02 15:04:05"))
}