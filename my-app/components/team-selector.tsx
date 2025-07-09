"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Team } from "@/types"

interface TeamSelectorProps {
  onTeamSelect: (team: Team) => void
  selectedTeam: Team | null
}

export default function TeamSelector({ onTeamSelect, selectedTeam }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/teams")
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      const data = await response.json()
      console.log("API response:", data) // Debug: Log raw response
      if (!Array.isArray(data)) {
        throw new Error("Invalid response: Expected an array of teams")
      }
      setTeams(data)
    } catch (error: any) {
      console.error("Error fetching teams:", error.message)
      setError("Failed to load teams. Please try again.")
      setTeams([]) // Ensure teams is an array
    } finally {
      setLoading(false)
    }
  }

  const filteredTeams = Array.isArray(teams)
    ? teams.filter(
        (team) =>
          team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          team.market.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : []

  console.log("Teams type:", typeof teams, "Teams value:", teams)
  console.log("Teams loaded:", teams.length)
  console.log("Filtered teams:", filteredTeams.length)
  console.log("Search term:", searchTerm)


  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl text-white flex items-center gap-3 justify-center">
          <Search className="w-6 h-6" />
          Select Opposing Team
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <div className="space-y-6">
          <Input
            placeholder="Search by college name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/20 border-white/30 text-white placeholder:text-gray-300 h-12 text-lg"
          />

          <div className="max-h-96 overflow-y-auto space-y-3">
            {error && (
              <div className="text-center text-red-500 py-8 text-lg">{error}</div>
            )}
            {loading ? (
              <div className="text-center text-white py-8 text-lg">Loading teams...</div>
            ) : teams.length === 0 && !error ? (
              <div className="text-center text-white py-8 text-lg">
                <p>No teams available</p>
                <p className="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
              </div>
            ) : filteredTeams.length === 0 && searchTerm ? (
              <div className="text-center text-white py-8 text-lg">
                <p>No teams found for "{searchTerm}"</p>
                <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
              </div>
            ) : (
              filteredTeams.map((team) => (
                <Button
                  key={team.id}
                  variant={selectedTeam?.id === team.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left p-4 h-auto text-lg ${
                    selectedTeam?.id === team.id ? "bg-orange-600 text-white" : "text-white hover:bg-white/20"
                  }`}
                  onClick={() => onTeamSelect(team)}
                >
                  <div>
                    <div className="font-semibold text-lg">{team.name}</div>
                    <div className="text-base opacity-80">{team.market}</div>
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