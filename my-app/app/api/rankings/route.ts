import { NextResponse } from "next/server";
import axios from "axios";
import db from "@/lib/db";

const API_KEY = process.env.SPORTRADAR_API_KEY;
const RANKINGS_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/seasons/2024/REG/netrankings.json";

function runAsync(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function allAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function GET() {
  console.log("jennadebug RANKINGS 1: Starting /api/rankings");
  try {
    // Ensure team_rankings table exists
    console.log("jennadebug RANKINGS 1.5: Creating team_rankings table if not exists...");
    await runAsync(
      "CREATE TABLE IF NOT EXISTS team_rankings (team_id TEXT PRIMARY KEY, net_rank INTEGER, updated_at DATETIME, FOREIGN KEY (team_id) REFERENCES teams(id))"
    );

    // Initialize rankings for all teams if not already done
    console.log("jennadebug RANKINGS 1.6: Initializing team_rankings with NULL ranks...");
    await runAsync(
      "INSERT OR IGNORE INTO team_rankings (team_id, net_rank, updated_at) SELECT id, NULL, NULL FROM teams"
    );

    // Check cache age
    console.log("jennadebug RANKINGS 2: Checking cache...");
    const cacheCheck = await allAsync<{ updated_at: string }>(
      "SELECT updated_at FROM team_rankings WHERE updated_at IS NOT NULL LIMIT 1"
    );
    const cacheAge = cacheCheck.length > 0 && cacheCheck[0].updated_at
      ? (Date.now() - new Date(cacheCheck[0].updated_at).getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (cacheAge < 24) {
      console.log("jennadebug RANKINGS 3: Returning cached rankings");
      const rankings = await allAsync<{ team_id: string; net_rank: number | null }>(
        "SELECT team_id, net_rank FROM team_rankings"
      );
      return NextResponse.json(rankings);
    }

    // Validate API key
    if (!API_KEY) {
      console.error("jennadebug RANKINGS 4: Missing SPORTRADAR_API_KEY");
      return NextResponse.json([], { status: 500 });
    }

    // Fetch rankings from Sportradar
    console.log("jennadebug RANKINGS 5: Fetching rankings from Sportradar...");
    let response;
    try {
      response = await axios.get(RANKINGS_URL, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.error("jennadebug RANKINGS 6: Rate limited by Sportradar API (429)");
        return NextResponse.json([], { status: 429 });
      }
      console.error("jennadebug RANKINGS 7: Sportradar API error:", err.message);
      return NextResponse.json([], { status: err.response?.status || 500 });
    }

    const rankingsRaw = response.data.rankings || [];
    console.log("jennadebug RANKINGS 8: Fetched", rankingsRaw.length, "rankings");

    // Reset all rankings to NULL
    console.log("jennadebug RANKINGS 9: Resetting rankings...");
    await runAsync("UPDATE team_rankings SET net_rank = NULL, updated_at = NULL");

    // Update rankings for ranked teams
    const now = new Date().toISOString();
    const batchSize = 100;
    for (let i = 0; i < rankingsRaw.length; i += batchSize) {
      const batch = rankingsRaw.slice(i, i + batchSize);
      console.log("jennadebug RANKINGS 10: Processing batch", i / batchSize + 1, "with", batch.length, "teams");

      const insertPromises = batch.map((team: any) =>
        runAsync(
          "UPDATE team_rankings SET net_rank = ?, updated_at = ? WHERE team_id = ?",
          [team.net_rank, now, team.id]
        ).catch((err) => {
          console.error(`jennadebug RANKINGS 11: Failed to update team_id=${team.id}:`, err);
        })
      );
      await Promise.all(insertPromises);
    }

    console.log("jennadebug RANKINGS 12: Cached", rankingsRaw.length, "rankings");
    const rankings = await allAsync<{ team_id: string; net_rank: number | null }>(
      "SELECT team_id, net_rank FROM team_rankings"
    );
    console.log("jennadebug RANKINGS 13: Returning", rankings.length, "rankings");
    return NextResponse.json(rankings);
  } catch (error: any) {
    console.error("jennadebug RANKINGS 14: API error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}