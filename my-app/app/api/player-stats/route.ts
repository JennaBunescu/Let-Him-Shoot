import { NextResponse } from "next/server";
import type { PlayerStats } from "@/types";
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
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour cache TTL
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper function for retrying API calls
async function fetchWithRetry(url: string, options: any, retries: number = MAX_RETRIES): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, options);
      console.log(`Successfully fetched data for ${url}`);
      return response;
    } catch (apiError: any) {
      console.warn(`Rate limited (attempt ${attempt}/${retries}), retrying after ${RETRY_DELAY_MS * attempt}ms...`);
      if (apiError.response?.status === 429 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw apiError;
    }
  }
  throw new Error("Max retries reached");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  const teamId = url.searchParams.get("teamId");

  if (!playerId || !teamId) {
    console.error("Missing playerId or teamId");
    return NextResponse.json({ error: "Missing playerId or teamId" }, { status: 400 });
  }

  try {
    // Step 1: Ensure player_stats table exists
    await runAsync(
      `CREATE TABLE IF NOT EXISTS player_stats (
        player_id TEXT,
        team_id TEXT,
        data TEXT,
        cached_at INTEGER,
        PRIMARY KEY (player_id, team_id)
      )`
    );

    // Step 2: Check SQLite cache
    const cachedRow = await getAsync<{ data: string; cached_at: number }>(
      "SELECT data, cached_at FROM player_stats WHERE player_id = ? AND team_id = ?",
      [playerId, teamId]
    );

    // Check if cache is valid (not expired) and not all zeros
    const now = Math.floor(Date.now() / 1000);
    if (cachedRow && cachedRow.cached_at + CACHE_TTL_SECONDS > now) {
      const cachedStats: PlayerStats = JSON.parse(cachedRow.data);
      // Force refresh if cached stats are all zeros (likely stale or incorrect)
      if (cachedStats.threePtPercentage !== 0 || cachedStats.pointsPerGame !== 0) {
        console.log("Returning cached stats for playerId:", playerId);
        return NextResponse.json(cachedStats);
      }
    }

    // Step 3: Validate playerId in team_rosters table
    const rosterRow = await getAsync<{ id: string }>(
      "SELECT id FROM team_rosters WHERE team_id = ? AND id = ?",
      [teamId, playerId]
    );

    if (!rosterRow) {
      return NextResponse.json({ error: `Player with ID ${playerId} not found on roster` }, { status: 404 });
    }


    // Step 4: Validate API key
    if (!API_KEY) {
      console.error("Missing SPORTRADAR_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Step 5: Fetch from Sportradar player profile API
    console.log("Fetching stats for playerId:", playerId, "from Sportradar...");
    let response;
    try {
      response = await fetchWithRetry(`${BASE_URL}/${playerId}/profile.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (apiError: any) {
      console.error("Sportradar API error for playerId:", playerId, apiError.message, "Status:", apiError.response?.status);
      // Attempt to return stale cache if available
      if (cachedRow) {
        const cachedStats: PlayerStats = JSON.parse(cachedRow.data);
        return NextResponse.json(cachedStats);
      }
      return NextResponse.json(
        { error: `Failed to fetch from Sportradar: ${apiError.message}` },
        { status: apiError.response?.status || 500 }
      );
    }

    const playerData = response.data;
    console.log("Raw playerData:", JSON.stringify(playerData, null, 2));

    // Step 6: Find 2024 REG season stats
    const season2024 = playerData.seasons?.find((season: any) => season.year === 2024 && season.type === "REG");
    let playerStats: PlayerStats;

    if (!season2024) {
      playerStats = {
        playerId,
        gamesPlayed: 0,
        minutesPerGame: 0,
        pointsPerGame: 0,
        reboundsPerGame: 0,
        assistsPerGame: 0,
        stealsPerGame: 0,
        blocksPerGame: 0,
        turnoversPerGame: 0,
        personalFoulsPerGame: 0,
        threePtPercentage: 0,
        threePtAttemptsPerGame: 0,
        threePtMadePerGame: 0,
        fgPercentage: 0,
        fgAttemptsPerGame: 0,
        fgMadePerGame: 0,
        ftPercentage: 0,
        ftAttemptsPerGame: 0,
        ftMadePerGame: 0,
        trueShootingPercentage: 0,
        efficiency: 0,
        gameLog: [],
      };
    } else {
      const teamStats = season2024.teams?.[0] || {};
      playerStats = {
        playerId,
        gamesPlayed: teamStats.total?.games_played ?? 0,
        minutesPerGame: teamStats.average?.minutes ?? 0,
        pointsPerGame: teamStats.average?.points ?? 0,
        reboundsPerGame: teamStats.average?.rebounds ?? 0,
        assistsPerGame: teamStats.average?.assists ?? 0,
        stealsPerGame: teamStats.average?.steals ?? 0,
        blocksPerGame: teamStats.average?.blocks ?? 0,
        turnoversPerGame: teamStats.average?.turnovers ?? 0,
        personalFoulsPerGame: teamStats.average?.personal_fouls ?? 0,
        threePtPercentage: (teamStats.total?.three_points_pct ?? 0) * 100,
        threePtAttemptsPerGame: teamStats.average?.three_points_att ?? 0,
        threePtMadePerGame: teamStats.average?.three_points_made ?? 0,
        fgPercentage: (teamStats.total?.field_goals_pct ?? 0) * 100,
        fgAttemptsPerGame: teamStats.average?.field_goals_att ?? 0,
        fgMadePerGame: teamStats.average?.field_goals_made ?? 0,
        ftPercentage: (teamStats.total?.free_throws_pct ?? 0) * 100,
        ftAttemptsPerGame: teamStats.average?.free_throws_att ?? 0,
        ftMadePerGame: teamStats.average?.free_throws_made ?? 0,
        trueShootingPercentage: (teamStats.total?.true_shooting_pct ?? 0) * 100,
        efficiency: teamStats.total?.efficiency ?? 0,
        gameLog: [],
      };
    }

    // Step 7: Store in SQLite with timestamp
    await runAsync(
      "INSERT OR REPLACE INTO player_stats (player_id, team_id, data, cached_at) VALUES (?, ?, ?, ?)",
      [playerId, teamId, JSON.stringify(playerStats), now]
    );
    console.log("Cached stats for playerId:", playerId);
    return NextResponse.json(playerStats);
  } catch (error: any) {
    console.error(" General error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}