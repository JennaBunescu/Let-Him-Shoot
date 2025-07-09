"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Team, Player } from "@/types"
import { Input } from "@/components/ui/input"

interface PlayerRosterProps {
  team: Team
  onPlayerSelect: (player: Player) => void
  selectedPlayer: Player | null
}

export default function PlayerRoster({ team, onPlayerSelect, selectedPlayer }: PlayerRosterProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (team) {
      fetchPlayers()
    }
  }, [team])

  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/team/${team.id}/roster`)
      const data = await response.json()
      setPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter(
    (player) =>
      player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (player.jersey_number && player.jersey_number.includes(searchTerm))
  )

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          {team.name} Roster
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/20 border-white/30 text-white placeholder:text-gray-300"
          />

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center text-white py-4">Loading roster...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center text-white py-4">No players found</div>
            ) : (
              filteredPlayers.map((player) => (
                <Button
                  key={player.id}
                  variant={selectedPlayer?.id === player.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left p-3 h-auto ${
                    selectedPlayer?.id === player.id ? "bg-orange-600 text-white" : "text-white hover:bg-white/20"
                  }`}
                  onClick={() => onPlayerSelect(player)}
                >
                  <div>
                    <div className="font-semibold">
                      {player.jersey_number ? `#${player.jersey_number}` : ""} {player.full_name}
                    </div>
                    <div className="text-sm opacity-80">
                      {player.position} • {player.experience}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}