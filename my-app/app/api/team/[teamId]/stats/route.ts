import { NextResponse } from "next/server";
import type { TeamStats } from "@/types";
import axios from "axios";
import sqlite3 from "sqlite3";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/seasons/2024/REG/teams";

// Initialize SQLite
const db = new sqlite3.Database("./ncaamb_data.db");

export async function GET(request: Request, { params }: { params: { teamId: string } }) {
  console.log("alexdebug STATS 1: Route handler invoked for teamId:", params.teamId);
  const { teamId } = params;

  try {
    // Step 1: Ensure table exists
    console.log("alexdebug STATS 2: Creating or checking team_stats table");
    await new Promise<void>((resolve, reject) => {
      db.run(
        "CREATE TABLE IF NOT EXISTS team_stats (team_id TEXT PRIMARY KEY, data TEXT)",
        (err) => {
          if (err) {
            console.error("alexdebug STATS 3: SQLite create table error:", err.message);
            reject(err);
          } else {
            console.log("alexdebug STATS 3: Table created or already exists");
            resolve();
          }
        }
      );
    });

    // Step 2: Check SQLite cache
    console.log("alexdebug STATS 4: Checking SQLite cache for teamId:", teamId);
    const cachedRows = await new Promise<{ data: string }[]>((resolve, reject) => {
      db.all("SELECT data FROM team_stats WHERE team_id = ?", [teamId], (err, rows) => {
        if (err) {
          console.error("alexdebug STATS 5: SQLite select error:", err.message);
          reject(err);
        } else {
          console.log("alexdebug STATS 5: Found", rows.length, "cached rows for teamId:", teamId);
          resolve(rows as { data: string }[]);
        }
      });
    });

    if (cachedRows.length > 0) {
      const cachedStats: TeamStats = JSON.parse(cachedRows[0].data);
      console.log("alexdebug STATS 6: Returning cached stats for teamId:", teamId);
      return NextResponse.json(cachedStats);
    }

    console.log("alexdebug STATS 7: No cache found, fetching from Sportradar for teamId:", teamId);
    // Step 3: Validate API key
    if (!API_KEY) {
      console.error("alexdebug STATS 8: Missing SPORTRADAR_API_KEY");
      return NextResponse.json({}, { status: 500 });
    }

    // Step 4: Fetch from Sportradar
    console.log("alexdebug STATS 9: Fetching stats for teamId:", teamId, "from Sportradar...");
    let response;
    try {
      response = await axios.get(`${BASE_URL}/${teamId}/statistics.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (apiError: any) {
      console.error("alexdebug STATS 10: Sportradar API error:", apiError.message, "Status:", apiError.response?.status);
      return NextResponse.json({}, { status: apiError.response?.status || 500 });
    }

    console.log("alexdebug STATS 11: Sportradar API response status:", response.status);
    const teamRaw = response.data;

    // Step 5: Format into TeamStats
    const teamStats: TeamStats = {
      teamId,
      gamesPlayed: teamRaw.own_record.total.games_played,
      minutes: teamRaw.own_record.total.minutes,
      pointsPerGame: teamRaw.own_record.average.points,
      reboundsPerGame: teamRaw.own_record.average.rebounds,
      assistsPerGame: teamRaw.own_record.average.assists,
      stealsPerGame: teamRaw.own_record.average.steals,
      blocksPerGame: teamRaw.own_record.average.blocks,
      turnoversPerGame: teamRaw.own_record.average.turnovers,
      personalFoulsPerGame: teamRaw.own_record.average.personal_fouls,
      threePtPercentage: teamRaw.own_record.total.three_points_pct * 100,
      threePtAttemptsPerGame: teamRaw.own_record.average.three_points_att,
      threePtMadePerGame: teamRaw.own_record.average.three_points_made,
      fgPercentage: teamRaw.own_record.total.field_goals_pct * 100,
      fgAttemptsPerGame: teamRaw.own_record.average.field_goals_att,
      fgMadePerGame: teamRaw.own_record.average.field_goals_made,
      ftPercentage: teamRaw.own_record.total.free_throws_pct * 100,
      ftAttemptsPerGame: teamRaw.own_record.average.free_throws_att,
      ftMadePerGame: teamRaw.own_record.average.free_throws_made,
      pointsInPaintPerGame: teamRaw.own_record.average.points_in_paint,
      secondChancePointsPerGame: teamRaw.own_record.average.second_chance_pts,
      fastBreakPointsPerGame: teamRaw.own_record.average.fast_break_pts,
      pointsOffTurnoversPerGame: teamRaw.own_record.average.points_off_turnovers,
      trueShootingPercentage: teamRaw.own_record.total.true_shooting_pct * 100,
      efficiency: teamRaw.own_record.total.efficiency,
      wins: undefined, // Not provided in API
      losses: undefined,
      conferenceWins: undefined,
      conferenceLosses: undefined,
    };

    // Step 6: Store in SQLite
    console.log("alexdebug STATS 12: Deleting existing stats for teamId:", teamId);
    await new Promise<void>((resolve, reject) => {
      db.run("DELETE FROM team_stats WHERE team_id = ?", [teamId], (err) => {
        if (err) {
          console.error("alexdebug STATS 13: SQLite delete error:", err.message);
          reject(err);
        } else {
          console.log("alexdebug STATS 13: Deleted existing stats for teamId:", teamId);
          resolve();
        }
      });
    });

    console.log("alexdebug STATS 14: Inserting stats for teamId:", teamId);
    await new Promise<void>((resolve, reject) => {
      db.run(
        "INSERT INTO team_stats (team_id, data) VALUES (?, ?)",
        [teamId, JSON.stringify(teamStats)],
        (err) => {
          if (err) {
            console.error("alexdebug STATS 15: SQLite insert error for teamId:", teamId, ":", err.message);
            reject(err);
          } else {
            console.log("alexdebug STATS 15: Inserted stats for teamId:", teamId);
            resolve();
          }
        }
      );
    });

    console.log("alexdebug STATS 16: Returning stats for teamId:", teamId);
    return NextResponse.json(teamStats);
  } catch (error: any) {
    console.error("alexdebug STATS 17: General error:", error.message);
    return NextResponse.json({}, { status: 500 });
  }
}