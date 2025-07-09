import { NextResponse } from "next/server";
import type { PlayerStats } from "@/types";
import axios from "axios";
import sqlite3 from "sqlite3";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/seasons/2024/REG/teams";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour cache TTL
const MAX_RETRIES = 3; // Max retries for rate limit
const RETRY_DELAY_MS = 1000; // Delay between retries (1 second)

// Initialize SQLite
const db = new sqlite3.Database("./ncaamb_data.db");

// Promisify db operations for convenience
function runAsync(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getAsync<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

// Helper function for retrying API calls
async function fetchWithRetry(url: string, options: any, retries: number = MAX_RETRIES): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, options);
      return response;
    } catch (apiError: any) {
      if (apiError.response?.status === 429 && attempt < retries) {
        console.warn(`alexdebug PLAYER_STATS 10: Rate limited (attempt ${attempt}/${retries}), retrying after ${RETRY_DELAY_MS}ms...`);
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

  console.log("alexdebug PLAYER_STATS 1: Route handler invoked for playerId:", playerId, "teamId:", teamId);

  if (!playerId || !teamId) {
    console.error("alexdebug PLAYER_STATS 2: Missing playerId or teamId");
    return NextResponse.json({ error: "Missing playerId or teamId" }, { status: 400 });
  }

  try {
    // Step 1: Ensure player_stats table exists
    console.log("alexdebug PLAYER_STATS 3: Creating or checking player_stats table");
    await runAsync(
      `CREATE TABLE IF NOT EXISTS player_stats (
        player_id TEXT,
        team_id TEXT,
        data TEXT,
        cached_at INTEGER,
        PRIMARY KEY (player_id, team_id)
      )`
    );
    console.log("alexdebug PLAYER_STATS 4: Table created or exists");

    // Step 2: Check SQLite cache
    console.log("alexdebug PLAYER_STATS 5: Checking SQLite cache for playerId:", playerId, "teamId:", teamId);
    const cachedRow = await getAsync<{ data: string; cached_at: number }>(
      "SELECT data, cached_at FROM player_stats WHERE player_id = ? AND team_id = ?",
      [playerId, teamId]
    );

    // Check if cache is valid (not expired)
    const now = Math.floor(Date.now() / 1000);
    if (cachedRow && cachedRow.cached_at + CACHE_TTL_SECONDS > now) {
      console.log("alexdebug PLAYER_STATS 6: Returning cached stats for playerId:", playerId);
      const cachedStats: PlayerStats = JSON.parse(cachedRow.data);
      return NextResponse.json(cachedStats);
    }

    // Step 3: Validate playerId in team_rosters table
    console.log("alexdebug PLAYER_STATS 7: Checking if playerId:", playerId, "exists in team_rosters for teamId:", teamId);
    const rosterRow = await getAsync<{ id: string }>(
      "SELECT id FROM team_rosters WHERE team_id = ? AND id = ?",
      [teamId, playerId]
    );

    if (!rosterRow) {
      console.error("alexdebug PLAYER_STATS 8: PlayerId:", playerId, "not found in team_rosters for teamId:", teamId);
      return NextResponse.json({ error: `Player with ID ${playerId} not found on roster` }, { status: 404 });
    }
    console.log("alexdebug PLAYER_STATS 9: PlayerId:", playerId, "found in team_rosters");

    // Step 4: Validate API key
    if (!API_KEY) {
      console.error("alexdebug PLAYER_STATS 10: Missing SPORTRADAR_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Step 5: Fetch from Sportradar with retry
    console.log("alexdebug PLAYER_STATS 11: Fetching stats for teamId:", teamId, "from Sportradar...");
    let response;
    try {
      response = await fetchWithRetry(`${BASE_URL}/${teamId}/statistics.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (apiError: any) {
      console.error("alexdebug PLAYER_STATS 12: Sportradar API error:", apiError.message, "Status:", apiError.response?.status);
      // Attempt to return stale cache if available
      if (cachedRow) {
        console.log("alexdebug PLAYER_STATS 12: Falling back to stale cache for playerId:", playerId);
        const cachedStats: PlayerStats = JSON.parse(cachedRow.data);
        return NextResponse.json(cachedStats);
      }
      return NextResponse.json(
        { error: `Failed to fetch from Sportradar: ${apiError.message}` },
        { status: apiError.response?.status || 500 }
      );
    }

    console.log("alexdebug PLAYER_STATS 13: Sportradar API response status:", response.status);
    const playersRaw = response.data.players || [];

    // Step 6: Validate response data
    if (!Array.isArray(playersRaw)) {
      console.error("alexdebug PLAYER_STATS 14: Invalid Sportradar response: players array missing");
      return NextResponse.json({ error: "Invalid data from Sportradar" }, { status: 500 });
    }

    // Step 7: Find player stats
    const playerRaw = playersRaw.find((p: any) => p.id === playerId);
    let playerStats: PlayerStats;

    if (!playerRaw) {
      console.log("alexdebug PLAYER_STATS 15: Player not found in 2024 stats for playerId:", playerId, "returning default stats");
      // Player is in roster but not in stats, return default stats
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
      console.log("alexdebug PLAYER_STATS 15: Found playerRaw:", JSON.stringify(playerRaw, null, 2));
      // Format into PlayerStats with safe defaults
      playerStats = {
        playerId,
        gamesPlayed: playerRaw.total?.games_played ?? 0,
        minutesPerGame: playerRaw.average?.minutes ?? 0,
        pointsPerGame: playerRaw.average?.points ?? 0,
        reboundsPerGame: playerRaw.average?.rebounds ?? 0,
        assistsPerGame: playerRaw.average?.assists ?? 0,
        stealsPerGame: playerRaw.average?.steals ?? 0,
        blocksPerGame: playerRaw.average?.blocks ?? 0,
        turnoversPerGame: playerRaw.average?.turnovers ?? 0,
        personalFoulsPerGame: playerRaw.average?.personal_fouls ?? 0,
        threePtPercentage: (playerRaw.total?.three_points_pct ?? 0) * 100,
        threePtAttemptsPerGame: playerRaw.average?.three_points_att ?? 0,
        threePtMadePerGame: playerRaw.average?.three_points_made ?? 0,
        fgPercentage: (playerRaw.total?.field_goals_pct ?? 0) * 100,
        fgAttemptsPerGame: playerRaw.average?.field_goals_att ?? 0,
        fgMadePerGame: playerRaw.average?.field_goals_made ?? 0,
        ftPercentage: (playerRaw.total?.free_throws_pct ?? 0) * 100,
        ftAttemptsPerGame: playerRaw.average?.free_throws_att ?? 0,
        ftMadePerGame: playerRaw.average?.free_throws_made ?? 0,
        trueShootingPercentage: (playerRaw.total?.true_shooting_pct ?? 0) * 100,
        efficiency: playerRaw.total?.efficiency ?? 0,
        gameLog: [], // TODO: Fetch game log data if available from Sportradar
      };
    }

    // Step 8: Store in SQLite with timestamp
    console.log("alexdebug PLAYER_STATS 16: Inserting stats for playerId:", playerId, "teamId:", teamId);
    await runAsync(
      "INSERT OR REPLACE INTO player_stats (player_id, team_id, data, cached_at) VALUES (?, ?, ?, ?)",
      [playerId, teamId, JSON.stringify(playerStats), now]
    );
    console.log("alexdebug PLAYER_STATS 17: Cached stats for playerId:", playerId);

    return NextResponse.json(playerStats);
  } catch (error: any) {
    console.error("alexdebug PLAYER_STATS 18: General error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}