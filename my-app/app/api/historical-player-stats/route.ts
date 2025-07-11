// route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import db from "@/lib/db";

// Helper to execute SQLite queries
function runAsync(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Helper to get SQLite data
function getAsync<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

// Load environment variables
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/players";
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day cache TTL
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE_MS = 2000;

async function fetchWithRetry(url: string, options: any, retries: number = MAX_RETRIES): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, options);
      console.log(`Successfully fetched data for ${url}`);
      return response;
    } catch (apiError: any) {
      console.error(`fetchWithRetry attempt ${attempt}/${retries} failed for ${url}:`, apiError.message);
      if (apiError.response?.status === 429 && attempt < retries) {
        const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`Rate limited (attempt ${attempt}/${retries}), retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw apiError;
    }
  }
  throw new Error("Max retries reached");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId");
  const playerId = url.searchParams.get("playerId");

  if (!teamId || !playerId) {
    console.error("Missing teamId or playerId");
    return NextResponse.json({ error: "Missing teamId or playerId" }, { status: 400 });
  }

  try {
    await runAsync(
      `CREATE TABLE IF NOT EXISTS historical_player_stats (
        player_id TEXT,
        team_id TEXT,
        year1 INTEGER,
        three_pt_pct_year1 REAL,
        year2 INTEGER,
        three_pt_pct_year2 REAL,
        year3 INTEGER,
        three_pt_pct_year3 REAL,
        cached_at INTEGER,
        PRIMARY KEY (player_id, team_id)
      )`
    );
    console.log("Table historical_player_stats created or exists");

    if (!API_KEY) {
      console.error("Missing SPORTRADAR_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const currentYear = 2024;

    const cachedRow = await getAsync<{
      year1: number;
      three_pt_pct_year1: number;
      year2: number;
      three_pt_pct_year2: number;
      year3: number;
      three_pt_pct_year3: number;
      cached_at: number;
    }>(
      "SELECT year1, three_pt_pct_year1, year2, three_pt_pct_year2, year3, three_pt_pct_year3, cached_at FROM historical_player_stats WHERE player_id = ? AND team_id = ?",
      [playerId, teamId]
    );

    if (cachedRow && cachedRow.cached_at + CACHE_TTL_SECONDS > now) {
      console.log(`Cache hit for playerId: ${playerId}, cached at: ${new Date(cachedRow.cached_at * 1000)}`);
      return NextResponse.json({
        playerId,
        year1: cachedRow.year1,
        threePtPctYear1: cachedRow.three_pt_pct_year1,
        year2: cachedRow.year2,
        threePtPctYear2: cachedRow.three_pt_pct_year2,
        year3: cachedRow.year3,
        threePtPctYear3: cachedRow.three_pt_pct_year3,
      });
    }

    let playerData;
    try {
      const response = await fetchWithRetry(`${BASE_URL}/${playerId}/profile.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
      playerData = response.data;
    } catch (apiError: any) {
      console.error("Sportradar API error for playerId:", playerId, apiError.message);
      const defaultStats = {
        playerId,
        year1: currentYear,
        threePtPctYear1: 0,
        year2: currentYear - 1,
        threePtPctYear2: 0,
        year3: currentYear - 2,
        threePtPctYear3: 0,
      };
      await runAsync(
        `INSERT OR REPLACE INTO historical_player_stats (player_id, team_id, year1, three_pt_pct_year1, year2, three_pt_pct_year2, year3, three_pt_pct_year3, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [playerId, teamId, defaultStats.year1, defaultStats.threePtPctYear1, defaultStats.year2, defaultStats.threePtPctYear2, defaultStats.year3, defaultStats.threePtPctYear3, now]
      );
      return NextResponse.json(defaultStats);
    }

    const regSeasons = playerData.seasons
      ?.filter((season: any) => season.type === "REG")
      ?.sort((a: any, b: any) => b.year - a.year) // Sort descending to prioritize recent years
      ?.slice(0, 3) || [];

    const stats = {
      playerId,
      year1: currentYear,
      threePtPctYear1: 0,
      year2: currentYear - 1,
      threePtPctYear2: 0,
      year3: currentYear - 2,
      threePtPctYear3: 0,
    };

    if (regSeasons.length === 1) {
      stats.year1 = regSeasons[0].year;
      stats.threePtPctYear1 = (regSeasons[0].teams?.[0]?.total?.three_points_pct ?? 0) * 100;
      stats.year2 = regSeasons[0].year - 1;
      stats.threePtPctYear2 = 0;
      stats.year3 = regSeasons[0].year - 2;
      stats.threePtPctYear3 = 0;
    } else if (regSeasons.length === 2) {
      stats.year1 = regSeasons[0].year;
      stats.threePtPctYear1 = (regSeasons[0].teams?.[0]?.total?.three_points_pct ?? 0) * 100;
      stats.year2 = regSeasons[1].year;
      stats.threePtPctYear2 = (regSeasons[1].teams?.[0]?.total?.three_points_pct ?? 0) * 100;
      stats.year3 = regSeasons[1].year - 1;
      stats.threePtPctYear3 = 0;
    } else if (regSeasons.length === 3) {
      stats.year1 = regSeasons[0].year;
      stats.threePtPctYear1 = (regSeasons[0].teams?.[0]?.total?.three_points_pct ?? 0) * 100;
      stats.year2 = regSeasons[1].year;
      stats.threePtPctYear2 = (regSeasons[1].teams?.[0]?.total?.three_points_pct ?? 0) * 100;
      stats.year3 = regSeasons[2].year;
      stats.threePtPctYear3 = (regSeasons[2].teams?.[0]?.total?.three_points_pct ?? 0) * 100;
    }

    await runAsync(
      `INSERT OR REPLACE INTO historical_player_stats (player_id, team_id, year1, three_pt_pct_year1, year2, three_pt_pct_year2, year3, three_pt_pct_year3, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [playerId, teamId, stats.year1, stats.threePtPctYear1, stats.year2, stats.threePtPctYear2, stats.year3, stats.threePtPctYear3, now]
    );

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("General error in historical-player-stats:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}