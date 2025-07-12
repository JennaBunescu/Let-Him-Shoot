import { NextResponse } from "next/server";
import type { Team } from "@/types";
import axios from "axios";
import db from "@/lib/db";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/league";

// Initialize SQLite
console.log("jennadebug database 1");

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
  console.log("jennadebug HERE 1");
  try {
    // Step 1: Ensure the teams table exists
    console.log("jennadebug HERE 1.5: Creating teams table if not exists...");
    await runAsync("CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, data TEXT)");

    // Step 2: Check SQLite database for cached teams
    console.log("jennadebug HERE 2: Checking SQLite for cached teams...");
    let cachedRows: { id: string; data: string }[];
    try {
      cachedRows = await allAsync<{ id: string; data: string }>("SELECT data FROM teams", []);
    } catch (err: any) {
      console.error("jennadebug HERE 2.5: SQLite query error:", err.message);
      throw err; // Rethrow to handle in outer catch block
    }

    if (cachedRows.length > 0) {
      console.log("jennadebug HERE 3: Found", cachedRows.length, "cached teams");
      const cachedTeams: Team[] = cachedRows.map((row) => JSON.parse(row.data));
      console.log("jennadebug HERE 4: Returning", cachedTeams.length, "teams from cache");
      return NextResponse.json(cachedTeams);
    }

    console.log("jennadebug HERE 5: No cached teams found, proceeding to fetch from API");

    // Step 3: Validate API key
    if (!API_KEY) {
      console.error("Missing SPORTRADAR_API_KEY");
      return NextResponse.json([], { status: 500 });
    }

    // Step 4: Fetch from Sportradar with rate-limit handling
    console.log("jennadebug HERE 6: Fetching teams from Sportradar...");
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

    console.log("jennadebug HERE 7: Sportradar API response status:", response.status);
    const teamsRaw = response.data.teams || [];

    // Step 5: Format into Team[]
    const teamData: Team[] = teamsRaw.map((team: any) => ({
      id: team.id || "",
      name: team.name || "Unknown",
      alias: team.alias || "",
      market: team.market || "",
    }));

    console.log("jennadebug HERE 8: Processed", teamData.length, "teams");

    // Step 6: Store in SQLite safely with awaits to avoid UNIQUE constraint errors
    await runAsync("DELETE FROM teams"); // Clear old data

    // Insert teams in batches to prevent truncation and improve performance
    const batchSize = 500;
    for (let i = 0; i < teamData.length; i += batchSize) {
      const batch = teamData.slice(i, i + batchSize);
      console.log("jennadebug HERE 9: Inserting batch", i / batchSize + 1, "with", batch.length, "teams");

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

    console.log("jennadebug HERE 10: Cached", teamData.length, "teams");
    console.log("jennadebug HERE 11: Teams raw length:", teamsRaw.length);

    return NextResponse.json(teamData);
  } catch (error: any) {
    console.error("jennadebug HERE 12: API error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}