"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, BarChart3, Trophy, Zap } from "lucide-react"
import type { Team, TeamStats } from "@/types"
// import TeamShootingChart from "./team-shooting-chart"
// import TeamPerformanceChart from "./team-performance-chart"

interface TeamStatsProps {
  team: Team
}

export default function TeamStats({ team }: TeamStatsProps) {
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamStats = async () => {
      setLoading(true)
      try {
        console.log("Fetching stats for teamId:", team.id)
        const response = await fetch(`/api/team/${team.id}/stats`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: TeamStats = await response.json()
        setStats(data)
      } catch (err: any) {
        console.error("Error fetching stats:", err.message)
        setError("Failed to load team stats")
      } finally {
        setLoading(false)
      }
    }
    fetchTeamStats()
  }, [team.id])

  if (loading) {
    return <div className="text-white">Loading team stats...</div>
  }

  if (error || !stats) {
    return <div className="text-red-400">{error || "No stats available"}</div>
  }

  const winPercentage = stats.wins && stats.losses 
    ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
    : "N/A"
  const confWinPercentage = stats.conferenceWins && stats.conferenceLosses 
    ? ((stats.conferenceWins / (stats.conferenceWins + stats.conferenceLosses)) * 100).toFixed(1)
    : "N/A"

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Team Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-300">Overall Record</p>
              <p className="text-2xl font-bold text-white">
                {stats.wins ?? "N/A"}-{stats.losses ?? "N/A"}
              </p>
              <p className="text-sm text-gray-300">{winPercentage}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300">Conference Record</p>
              <p className="text-2xl font-bold text-white">
                {stats.conferenceWins ?? "N/A"}-{stats.conferenceLosses ?? "N/A"}
              </p>
              <p className="text-sm text-gray-300">{confWinPercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm text-gray-300">Team 3PT%</p>
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
                <p className="text-sm text-gray-300">Points Per Game</p>
                <p className="text-2xl font-bold text-white">{stats.pointsPerGame.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-300">Efficiency</p>
                <p className="text-2xl font-bold text-white">{stats.efficiency.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-sm text-gray-300">True Shooting %</p>
                <p className="text-2xl font-bold text-white">{stats.trueShootingPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-300">FG%</p>
              <p className="text-lg font-semibold text-white">{stats.fgPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">FT%</p>
              <p className="text-lg font-semibold text-white">{stats.ftPercentage.toFixed(1)}%</p>
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
              <p className="text-gray-300">Turnovers/Game</p>
              <p className="text-lg font-semibold text-white">{stats.turnoversPerGame.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-300">Steals/Game</p>
              <p className="text-lg font-semibold text-white">{stats.stealsPerGame.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {/* <div className="space-y-6">
        <TeamShootingChart stats={stats} />
        <TeamPerformanceChart stats={stats} />
      </div> */}
    </div>
  )
}