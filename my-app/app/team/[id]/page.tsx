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
import type { Team, Player, PlayerStats as PlayerStatsType } from "@/types"

export default function TeamPage() {
  const params = useParams()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStatsType | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [isLethalShooter, setIsLethalShooter] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeam()
  }, [teamId])

  const fetchTeam = async () => {
    try {
      const response = await fetch("/api/teams")
      const teams = await response.json()
      const foundTeam = teams.find((t: Team) => t.id === teamId)
      setTeam(foundTeam || null)
    } catch (error) {
      console.error("Error fetching team:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerSelect = async (player: Player) => {
    setSelectedPlayer(player)

    try {
      const response = await fetch(`/api/player-stats?playerId=${player.id}&teamId=${teamId}`)
      const stats: PlayerStatsType = await response.json()

      setPlayerStats(stats)

      // Determine if player is a lethal shooter
      const isLethal = stats.threePtPercentage >= 35 && stats.threePtAttemptsPerGame >= 3
      setIsLethalShooter(isLethal)
      setShowAlert(true)

      // Hide alert after 3 seconds
      setTimeout(() => setShowAlert(false), 3000)
    } catch (error) {
      console.error("Error fetching player stats:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading team...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Team not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
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
            <p className="text-gray-300">
              {team.market}
            </p>
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

            {/* Show Player Stats when selected */}
            {playerStats && selectedPlayer && (
             <PlayerStats player={selectedPlayer} stats={playerStats} teamStats={team}/>
            )}
          </div>
        </div>
      </div>

      {showAlert && <ThreatAlert isLethalShooter={isLethalShooter} playerName={selectedPlayer?.full_name || ""} />}
    </div>
  )
}