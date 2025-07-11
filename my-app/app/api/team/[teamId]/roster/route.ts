import { NextResponse } from "next/server";
import type { Player } from "@/types";
import axios from "axios";
import db from "@/lib/db";


// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/teams";

// Example helper
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
  const { teamId } = params;

  try {
    // Step 1: Ensure table exists
    await runAsync(
      "CREATE TABLE IF NOT EXISTS team_rosters (team_id TEXT, id TEXT, data TEXT, PRIMARY KEY (team_id, id))"
    );

    // Step 2: Check SQLite cache
    const cachedRows = await allAsync<{ data: string }>(
      "SELECT data FROM team_rosters WHERE team_id = ?",
      [teamId]
    );

    if (cachedRows.length > 0) {
      const cachedPlayers: Player[] = cachedRows.map((row) => JSON.parse(row.data));
      return NextResponse.json(cachedPlayers);
    }

    // Step 3: Validate API key
    if (!API_KEY) {
      console.error("Missing SPORTRADAR_API_KEY");
      return NextResponse.json([], { status: 500 });
    }

    // Step 4: Fetch from Sportradar
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
        console.error("Rate limited by Sportradar API (429). Using cache if available.");
        return NextResponse.json([], { status: 429 });
      }
      console.error("Sportradar API error:", apiError.message, "Status:", apiError.response?.status);
      return NextResponse.json([], { status: apiError.response?.status || 500 });
    }

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
    await runAsync("DELETE FROM team_rosters WHERE team_id = ?", [teamId]);

    // Insert players in batches to prevent truncation
    const batchSize = 100;
    for (let i = 0; i < playerData.length; i += batchSize) {
      const batch = playerData.slice(i, i + batchSize);
      const insertPromises = batch.map((player) => {
        if (player.id) {
          return runAsync(
            "INSERT INTO team_rosters (team_id, id, data) VALUES (?, ?, ?)",
            [teamId, player.id, JSON.stringify(player)]
          ).catch((insertErr) => {
            console.error(`Failed to insert player id=${player.id}:`, insertErr);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(insertPromises);
    }

    return NextResponse.json(playerData);
  } catch (error: any) {
    console.error("General error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}