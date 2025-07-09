import { NextResponse } from "next/server";
import type { Player } from "@/types";
import axios from "axios";
import sqlite3 from "sqlite3";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/teams";

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

function allAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function GET(request: Request, { params }: { params: { teamId: string } }) {
  console.log("alexdebug ROSTER 1: Route handler invoked for teamId:", params.teamId);
  const { teamId } = params;

  try {
    // Step 1: Ensure table exists
    console.log("alexdebug ROSTER 2: Creating or checking team_rosters table");
    await runAsync(
      "CREATE TABLE IF NOT EXISTS team_rosters (team_id TEXT, id TEXT, data TEXT, PRIMARY KEY (team_id, id))"
    );
    console.log("alexdebug ROSTER 3: Table created or already exists");

    // Step 2: Check SQLite cache
    console.log("alexdebug ROSTER 4: Checking SQLite cache for teamId:", teamId);
    const cachedRows = await allAsync<{ data: string }>(
      "SELECT data FROM team_rosters WHERE team_id = ?",
      [teamId]
    );

    if (cachedRows.length > 0) {
      const cachedPlayers: Player[] = cachedRows.map((row) => JSON.parse(row.data));
      console.log("alexdebug ROSTER 5: Returning", cachedPlayers.length, "cached players for teamId:", teamId);
      return NextResponse.json(cachedPlayers);
    }

    console.log("alexdebug ROSTER 6: No cache found, fetching from Sportradar for teamId:", teamId);

    // Step 3: Validate API key
    if (!API_KEY) {
      console.error("alexdebug ROSTER 7: Missing SPORTRADAR_API_KEY");
      return NextResponse.json([], { status: 500 });
    }

    // Step 4: Fetch from Sportradar
    console.log("alexdebug ROSTER 8: Fetching roster for teamId:", teamId, "from Sportradar...");
    let response;
    try {
      response = await axios.get(`${BASE_URL}/${teamId}/profile.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (apiError: any) {
      if (apiError.response?.status === 429) {
        console.error("alexdebug ROSTER 9: Rate limited by Sportradar API (429). Using cache if available.");
        return NextResponse.json([], { status: 429 });
      }
      console.error("alexdebug ROSTER 9: Sportradar API error:", apiError.message, "Status:", apiError.response?.status);
      return NextResponse.json([], { status: apiError.response?.status || 500 });
    }

    console.log("alexdebug ROSTER 10: Sportradar API response status:", response.status);
    const playersRaw = response.data.players || [];

    // Step 5: Format into Player[]
    const playerData: Player[] = playersRaw.map((player: any) => ({
      id: player.id || "",
      full_name: player.full_name || "Unknown",
      jersey_number: player.jersey_number || undefined,
      position: player.position || "",
      experience: player.experience || "",
      teamId: teamId,
    }));

    // Step 6: Store in SQLite
    console.log("alexdebug ROSTER 11: Deleting existing roster for teamId:", teamId);
    await runAsync("DELETE FROM team_rosters WHERE team_id = ?", [teamId]);

    // Insert players in batches to prevent truncation
    const batchSize = 100;
    for (let i = 0; i < playerData.length; i += batchSize) {
      const batch = playerData.slice(i, i + batchSize);
      console.log("alexdebug ROSTER 12: Inserting batch", i / batchSize + 1, "with", batch.length, "players for teamId:", teamId);

      const insertPromises = batch.map((player) => {
        if (player.id) {
          return runAsync(
            "INSERT INTO team_rosters (team_id, id, data) VALUES (?, ?, ?)",
            [teamId, player.id, JSON.stringify(player)]
          ).catch((insertErr) => {
            console.error(`alexdebug ROSTER 13: Failed to insert player id=${player.id}:`, insertErr);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(insertPromises);
    }

    console.log("alexdebug ROSTER 14: Inserted", playerData.length, "players for teamId:", teamId);
    return NextResponse.json(playerData);
  } catch (error: any) {
    console.error("alexdebug ROSTER 15: General error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}