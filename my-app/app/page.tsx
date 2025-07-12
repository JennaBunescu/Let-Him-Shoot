"use client"
import { useRouter } from "next/navigation"
import TeamSelector from "@/components/team-selector"
import type { Team } from "@/types"

export default function Home() {
  const router = useRouter()

  const handleTeamSelect = (team: Team) => {
    router.push(`/team/${team.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center pt-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl text-white font-medium font-serif mb-6">Let Him Shoot</h1>
          <p className="text-xl text-gray-300 font-light">For three pointers only</p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <TeamSelector onTeamSelect={handleTeamSelect} selectedTeam={null} />
          </div>
        </div>
      </div>
    </div>
  )
}
