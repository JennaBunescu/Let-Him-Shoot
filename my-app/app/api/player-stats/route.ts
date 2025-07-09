import { NextResponse } from "next/server";
import type { PlayerStats } from "@/types";
import axios from "axios";
import sqlite3 from "sqlite3";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/seasons/2024/REG/teams";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour cache TTL

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
    // Step 1: Ensure table exists with correct schema
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

    console.log("alexdebug PLAYER_STATS 7: No valid cache found, fetching from Sportradar for playerId:", playerId);

    // Step 3: Validate API key
    if (!API_KEY) {
      console.error("alexdebug PLAYER_STATS 8: Missing SPORTRADAR_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Step 4: Fetch from Sportradar
    console.log("alexdebug PLAYER_STATS 9: Fetching stats for teamId:", teamId, "from Sportradar...");
    let response;
    try {
      response = await axios.get(`${BASE_URL}/${teamId}/statistics.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (apiError: any) {
      if (apiError.response?.status === 429) {
        console.error("alexdebug PLAYER_STATS 10: Rate limited by Sportradar API (429).");
        // Attempt to return stale cache if available
        if (cachedRow) {
          console.log("alexdebug PLAYER_STATS 10: Falling back to stale cache for playerId:", playerId);
          const cachedStats: PlayerStats = JSON.parse(cachedRow.data);
          return NextResponse.json(cachedStats);
        }
        return NextResponse.json({ error: "Rate limit exceeded, no cache available" }, { status: 429 });
      }
      console.error("alexdebug PLAYER_STATS 10: Sportradar API error:", apiError.message, "Status:", apiError.response?.status);
      return NextResponse.json(
        { error: `Failed to fetch from Sportradar: ${apiError.message}` },
        { status: apiError.response?.status || 500 }
      );
    }

    console.log("alexdebug PLAYER_STATS 11: Sportradar API response status:", response.status);
    const playersRaw = response.data.players || [];

    // Step 5: Validate response data
    if (!Array.isArray(playersRaw)) {
      console.error("alexdebug PLAYER_STATS 12: Invalid Sportradar response: players array missing");
      return NextResponse.json({ error: "Invalid data from Sportradar" }, { status: 500 });
    }

    // Step 6: Find player stats
    const playerRaw = playersRaw.find((p: any) => p.id === playerId);
    if (!playerRaw) {
      console.error("alexdebug PLAYER_STATS 13: Player not found for playerId:", playerId);
      return NextResponse.json({ error: `Player with ID ${playerId} not found` }, { status: 404 });
    }
    console.log("alexdebug PLAYER_STATS 14: Found playerRaw:", JSON.stringify(playerRaw, null, 2));

    // Step 7: Format into PlayerStats with safe defaults
    const playerStats: PlayerStats = {
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

    // Step 8: Store in SQLite with timestamp
    console.log("alexdebug PLAYER_STATS 15: Inserting stats for playerId:", playerId, "teamId:", teamId);
    await runAsync(
      "INSERT OR REPLACE INTO player_stats (player_id, team_id, data, cached_at) VALUES (?, ?, ?, ?)",
      [playerId, teamId, JSON.stringify(playerStats), now]
    );
    console.log("alexdebug PLAYER_STATS 16: Cached stats for playerId:", playerId);

    return NextResponse.json(playerStats);
  } catch (error: any) {
    console.error("alexdebug PLAYER_STATS 17: General error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}