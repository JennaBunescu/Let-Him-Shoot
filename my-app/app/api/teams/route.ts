import { NextResponse } from "next/server";
import type { Team } from "@/types";
import axios from "axios";
import sqlite3 from "sqlite3";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/league";

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

export async function GET() {
  console.log("alexdebug HERE 1");
  try {
    // Step 1: Check SQLite database first
    console.log("alexdebug HERE 2: Checking SQLite for cached teams...");
    const cachedRows = await allAsync<{ id: string; data: string }>("SELECT data FROM teams", []);
    
    if (cachedRows.length > 0) {
      console.log("alexdebug HERE 3: Found", cachedRows.length, "cached teams");
      const cachedTeams: Team[] = cachedRows.map((row) => JSON.parse(row.data));
      console.log("alexdebug HERE 4: Returning", cachedTeams.length, "teams from cache");
      console.log(cachedTeams.find((team) => team.name.toLowerCase().includes("duke")));
      return NextResponse.json(cachedTeams);
    }

    console.log("alexdebug HERE 5: No cached teams found, proceeding to fetch from API");

    // Step 2: Validate API key
    if (!API_KEY) {
      console.error("Missing SPORTRADAR_API_KEY");
      return NextResponse.json([], { status: 500 });
    }

    // Step 3: Fetch from Sportradar with rate-limit handling
    console.log("alexdebug HERE 6: Fetching teams from Sportradar...");
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
      console.error("Sportradar API error:", err.message);
      return NextResponse.json([], { status: 500 });
    }

    console.log("alexdebug HERE 7: Sportradar API response status:", response.status);
    const teamsRaw = response.data.teams || [];

    // Step 4: Format into Team[]
    const teamData: Team[] = teamsRaw.map((team: any) => ({
      id: team.id || "",
      name: team.name || "Unknown",
      alias: team.alias || "",
      market: team.market || "",
    }));

    console.log("alexdebug HERE 8: Processed", teamData.length, "teams");
    console.log(teamData.find((team) => team.name.toLowerCase().includes("duke")));

    // Step 5: Store in SQLite safely with awaits to avoid UNIQUE constraint errors
    await runAsync("CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, data TEXT)");
    await runAsync("DELETE FROM teams"); // Clear old data

    // Insert teams in batches to prevent truncation and improve performance
    const batchSize = 500;
    for (let i = 0; i < teamData.length; i += batchSize) {
      const batch = teamData.slice(i, i + batchSize);
      console.log("alexdebug HERE 9: Inserting batch", i / batchSize + 1, "with", batch.length, "teams");
      
      const insertPromises = batch.map((team) => {
        if (team.id) {
          return runAsync("INSERT INTO teams (id, data) VALUES (?, ?)", [
            team.id,
            JSON.stringify(team),
          ]).catch((insertErr) => {
            console.error(`Failed to insert team id=${team.id}:`, insertErr);
          });
        }
        return Promise.resolve();
      });

      await Promise.all(insertPromises);
    }

    console.log("alexdebug HERE 10: Cached", teamData.length, "teams");
    console.log("alexdebug HERE 11: Teams raw length:", teamsRaw.length);

    return NextResponse.json(teamData);
  } catch (error: any) {
    console.error("alexdebug HERE 12: API error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}