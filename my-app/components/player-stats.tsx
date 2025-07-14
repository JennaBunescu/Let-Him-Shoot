"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, BarChart3 } from "lucide-react";
import type { Player, PlayerStats as PlayerStatsType, Team } from "@/types";

interface PlayerStatsProps {
  player: Player;
  stats: PlayerStatsType;
  teamStats: Team;
}

export default function PlayerStats({ player, stats, teamStats }: PlayerStatsProps) {
  const shooterStatus: "lethal" | "fifty-fifty" | "let-him-shoot" | "unknown" = (() => {
    if (stats.threePtAttemptsPerGame <= 0.2) {
      return "unknown";
    } else if (stats.threePtPercentage >= 37 && stats.threePtAttemptsPerGame >= 2) {
      return "lethal";
    } else if ((stats.threePtPercentage >= 30 && stats.threePtPercentage < 37 && stats.threePtAttemptsPerGame > 0.2) || (stats.threePtPercentage >= 37 && stats.threePtAttemptsPerGame < 2) ) {
      return "fifty-fifty";
    }
    return "let-him-shoot";
  })();

  const badgeStyles = {
    lethal: {
      className: "bg-red-600 text-white",
      text: "LETHAL SHOOTER",
    },
    "fifty-fifty": {
      className: "bg-yellow-600 text-white",
      text: "50/50 SHOOTER",
    },
    "let-him-shoot": {
      className: "bg-green-600 text-white",
      text: "LET HIM SHOOT",
    },
    unknown: {
      className: "bg-gray-600 text-white",
      text: "UNIDENTIFIED",
    },
  };

  const { className, text } = badgeStyles[shooterStatus];

  return (
    <div className="space-y-6">
      {/* Player Header */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white">
                #{player.jersey_number || "N/A"} {player.full_name}
              </CardTitle>
              <p className="text-gray-300">
                {player.position} • {player.experience || "N/A"}
              </p>
            </div>
            <Badge variant="secondary" className={`text-lg px-4 py-2 ${className}`}>
              {text}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm text-gray-300">3PT Percentage</p>
                <p className="text-2xl font-bold text-white">{stats.threePtPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-sm text-gray-300">3PT Attempts/Game</p>
                <p className="text-2xl font-bold text-white">{stats.threePtAttemptsPerGame.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-300">3PT Made/Game</p>
                <p className="text-2xl font-bold text-white">{stats.threePtMadePerGame.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-300">Points/Game</p>
              <p className="text-lg font-semibold text-white">{stats.pointsPerGame.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">Rebounds/Game</p>
              <p className="text-lg font-semibold text-white">{stats.reboundsPerGame.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">Assists/Game</p>
              <p className="text-lg font-semibold text-white">{stats.assistsPerGame.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">Steals/Game</p>
              <p className="text-lg font-semibold text-white">{stats.stealsPerGame.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">Blocks/Game</p>
              <p className="text-lg font-semibold text-white">{stats.blocksPerGame.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">Turnovers/Game</p>
              <p className="text-lg font-semibold text-white">{stats.turnoversPerGame.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Charts */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShootingChart stats={stats} />
        <ComparisonChart playerStats={stats} teamName={teamStats.name} />
      </div>
      <GameLogChart gameLog={stats.gameLog} /> */}
    </div>
  );
}