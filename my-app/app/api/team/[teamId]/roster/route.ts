import { NextResponse } from "next/server";
import type { Player } from "@/types";
import axios from "axios";

// Load environment variable
const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = "https://api.sportradar.com/ncaamb/trial/v8/en/teams";

export async function GET(request: Request, { params }: { params: { teamId: string } }) {
  const { teamId } = params;

  try {
    // Step 1: Validate API key
    if (!API_KEY) {
      return NextResponse.json([], { status: 500 });
    }

    // Step 2: Fetch from Sportradar
    console.log("alexdebug ROSTER 1: Fetching roster for teamId:", teamId, "from Sportradar...");
    let response;
    try {
      response = await axios.get(`${BASE_URL}/${teamId}/profile.json`, {
        headers: {
          accept: "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (apiError: any) {
      console.error("alexdebug ROSTER 2: Sportradar API error:", apiError.message, "Status:", apiError.response?.status);
      return NextResponse.json([], { status: apiError.response?.status || 500 });
    }

    console.log("alexdebug ROSTER 3: Sportradar API response status:", response.status);
    const playersRaw = response.data.players || [];

    // Step 3: Format into Player[]
    const playerData: Player[] = playersRaw.map((player: any) => ({
      id: player.id || "",
      full_name: player.full_name || "Unknown",
      jersey_number: player.jersey_number || undefined,
      position: player.position || "",
      experience: player.experience || "",
      teamId: teamId,
    }));

    return NextResponse.json(playerData);
  } catch (error: any) {
    console.error("alexdebug ROSTER 4: General error:", error.message);
    return NextResponse.json([], { status: 500 });
  }
}