"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Shield } from "lucide-react"

interface ThreatAlertProps {
  isLethalShooter: boolean
  playerName: string
}

export default function ThreatAlert({ isLethalShooter, playerName }: ThreatAlertProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isLethalShooter ? "bg-red-600/95" : "bg-green-600/95"
      } backdrop-blur-sm animate-in fade-in duration-500`}
    >
      <div className="text-center text-white">
        <div className="mb-6">
          {isLethalShooter ? (
            <AlertTriangle className="w-32 h-32 mx-auto animate-pulse" />
          ) : (
            <Shield className="w-32 h-32 mx-auto animate-pulse" />
          )}
        </div>

        <h1 className="text-6xl md:text-8xl font-bold mb-4 animate-bounce">
          {isLethalShooter ? "🔥 LETHAL SHOOTER!" : "✅ LET HIM SHOOT"}
        </h1>

        <p className="text-2xl md:text-4xl font-semibold mb-2">{playerName}</p>

        <p className="text-xl md:text-2xl opacity-90">
          {isLethalShooter ? "CLOSE OUT HARD - HIGH THREAT!" : "Low shooting threat - Focus elsewhere"}
        </p>
      </div>
    </div>
  )
}
