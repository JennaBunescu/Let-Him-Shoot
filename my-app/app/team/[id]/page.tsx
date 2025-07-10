"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import PlayerRoster from "@/components/player-roster"
import PlayerStats from "@/components/player-stats"
import TeamStats from "@/components/team-stats"
import ThreatAlert from "@/components/threat-alert"
import HistoricalShootingChart from "@/components/shooting-chart"
import type { Team, Player, PlayerStats as PlayerStatsType } from "@/types"

export default function TeamPage() {
  const params = useParams()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStatsType | null>(null)
  const [historicalStats, setHistoricalStats] = useState<
    Array<{
      playerId: string;
      year1: number;
      threePtPctYear1: number;
      year2: number;
      threePtPctYear2: number;
      year3: number;
      threePtPctYear3: number;
    }> | null
  >(null)
  const [showAlert, setShowAlert] = useState(false)
  const [shooterStatus, setShooterStatus] = useState<"lethal" | "fifty-fifty" | "let-him-shoot" | null>(null)
  const [teamLoading, setTeamLoading] = useState(true)
  const [historicalLoading, setHistoricalLoading] = useState(false)

  useEffect(() => {
    fetchTeam()
  }, [teamId])

  const fetchTeam = async () => {
    try {
      setTeamLoading(true)
      const response = await fetch("/api/teams")
      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.status}`)
      }
      const teams = await response.json()
      const foundTeam = teams.find((t: Team) => t.id === teamId)
      setTeam(foundTeam || null)
    } catch (error) {
      console.error("Error fetching team:", error)
      setTeam(null)
    } finally {
      setTeamLoading(false)
    }
  }

  const fetchHistoricalStats = async (playerId: string) => {
    try {
      setHistoricalLoading(true)
      const response = await fetch(`/api/historical-player-stats?teamId=${teamId}&playerId=${playerId}`)
      if (!response.ok) {
        throw new Error(`Historical stats fetch failed: ${response.status}`)
      }
      const historicalData: {
        playerId: string;
        year1: number;
        threePtPctYear1: number;
        year2: number;
        threePtPctYear2: number;
        year3: number;
        threePtPctYear3: number;
      } = await response.json()
      console.log("Historical stats fetched for playerId:", playerId, JSON.stringify(historicalData, null, 2))
      setHistoricalStats([historicalData])
    } catch (error) {
      console.error("Error fetching historical stats for playerId:", playerId, error)
      setHistoricalStats(null)
    } finally {
      setHistoricalLoading(false)
    }
  }

  const handlePlayerSelect = async (player: Player) => {
    setSelectedPlayer(player)
    console.log("Selected player:", player.id, player.full_name)

    try {
      // Fetch current season stats
      const statsResponse = await fetch(`/api/player-stats?playerId=${player.id}&teamId=${teamId}`)
      if (!statsResponse.ok) {
        throw new Error(`Player stats fetch failed: ${statsResponse.status}`)
      }
      const stats: PlayerStatsType = await statsResponse.json()
      console.log("Player stats fetched:", JSON.stringify(stats, null, 2))
      setPlayerStats(stats)

      // Fetch historical stats for the selected player
      await fetchHistoricalStats(player.id)

      // Determine shooter status
      let status: "lethal" | "fifty-fifty" | "let-him-shoot" | null = null
      if (stats.threePtPercentage >= 36 && stats.threePtAttemptsPerGame >= 2) {
        status = "lethal"
      } else if (stats.threePtPercentage >= 30 && stats.threePtPercentage <= 35.9) {
        status = "fifty-fifty"
      } else if (stats.threePtPercentage < 30) {
        status = "let-him-shoot"
      }
      setShooterStatus(status)
      setShowAlert(true)
    } catch (error) {
      console.error("Error fetching player stats:", error)
      setPlayerStats(null)
      setShooterStatus(null)
    }
  }

  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showAlert])

  const handleClick = () => {
    setShowAlert(false)
  }

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading team...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black" onClick={handleClick}>
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/20 mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teams
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl text-white font-medium">{team.name}</h1>
            <p className="text-gray-300">{team.market}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Roster */}
          <div>
            <PlayerRoster team={team} onPlayerSelect={handlePlayerSelect} selectedPlayer={selectedPlayer} />
          </div>

          {/* Right side - Stats */}
          <div className="space-y-6">
            {/* Show Team Stats only when no player is selected */}
            {!selectedPlayer && <TeamStats team={team} />}

            {/* Show Player Stats and Historical Chart when selected */}
            {selectedPlayer && (
              <>
                {playerStats ? (
                  <PlayerStats player={selectedPlayer} stats={playerStats} teamStats={team} />
                ) : (
                  <div className="text-white text-lg">Loading...</div>
                )}
                {historicalLoading ? (
                  <div className="text-white text-lg">Loading...</div>
                ) : historicalStats ? (
                  <HistoricalShootingChart
                    stats={historicalStats.find((data) => data.playerId === selectedPlayer.id) || {
                      playerId: selectedPlayer.id,
                      year1: 2024,
                      threePtPctYear1: 0,
                      year2: 2023,
                      threePtPctYear2: 0,
                      year3: 2022,
                      threePtPctYear3: 0,
                    }}
                  />
                ) : (
                  <div className="text-white text-lg">Loading...</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showAlert && shooterStatus && (
        <ThreatAlert
          key={selectedPlayer?.id || "no-player"}
          shooterStatus={shooterStatus}
          playerName={selectedPlayer?.full_name || ""}
        />
      )}
    </div>
  )
}