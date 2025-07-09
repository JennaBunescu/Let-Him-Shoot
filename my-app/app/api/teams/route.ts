import { NextResponse } from "next/server";
import type { Team } from "@/types";
import axios from "axios";
import sqlite3 from "sqlite3";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/league";

// Initialize SQLite
const db = new sqlite3.Database("./ncaamb_data.db");

// Promisify db.run for convenience
function runAsync(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function GET() {
  console.log("alexdebug HERE 1");
  try {
    // Step 1: Validate API key
    if (!API_KEY) {
      console.error("Missing SPORTRADAR_API_KEY");
      return NextResponse.json([]);
    }
    console.log("alexdebug HERE 4");

    // Step 2: Fetch from Sportradar with rate-limit handling
    console.log("Fetching teams from Sportradar...");
    let response;
    try {
      response = await axios.get(`${BASE_URL}/teams.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.error("Rate limited by Sportradar API (429). Please try again later.");
        return NextResponse.json([], { status: 429 });
      }
      throw err;
    }
    console.log("alexdebug HERE 5");
    const teamsRaw = response.data.teams || [];

    // Step 3: Format into Team[]
    const teamData: Team[] = teamsRaw.map((team: any) => ({
      id: team.id || "",
      name: team.name || "Unknown",
      alias: team.alias || "",
      market: team.market || "",
    }));

    console.log(teamData.find((team) => team.name.toLowerCase().includes("duke")));

    // Step 4: Store in SQLite safely with awaits to avoid UNIQUE constraint errors
    await runAsync("CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, data TEXT)");
    await runAsync("DELETE FROM teams");

    for (const team of teamData) {
      if (team.id) {
        try {
          await runAsync("INSERT INTO teams (id, data) VALUES (?, ?)", [
            team.id,
            JSON.stringify(team),
          ]);
        } catch (insertErr) {
          console.error(`Failed to insert team id=${team.id}:`, insertErr);
          // optionally continue inserting others
        }
      }
    }

    console.log("Cached teams:", teamData.length);
    console.log("Teams raw length:", teamsRaw.length);

    return NextResponse.json(teamData);
  } catch (error: any) {
    console.error("API error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}
