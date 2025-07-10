"use client"

import { AlertTriangle, Shield, AlertCircle, HelpCircle } from "lucide-react"

interface ThreatAlertProps {
  shooterStatus: "lethal" | "fifty-fifty" | "let-him-shoot" | "unknown"
  playerName: string
}

export default function ThreatAlert({ shooterStatus, playerName }: ThreatAlertProps) {
  const alertStyles = {
    "lethal": {
      bgClass: "bg-red-600/95",
      icon: <AlertTriangle className="w-32 h-32 mx-auto animate-pulse" />,
      title: "🔥 LETHAL SHOOTER!",
      message: "CLOSE OUT HARD - HIGH THREAT!",
    },
    "fifty-fifty": {
      bgClass: "bg-yellow-600/95",
      icon: <AlertCircle className="w-32 h-32 mx-auto animate-pulse" />,
      title: "⚠️ 50/50 SHOOTER!",
      message: "MODERATE THREAT - CAN MAKE YOU PAY!",
    },
    "let-him-shoot": {
      bgClass: "bg-green-600/95",
      icon: <Shield className="w-32 h-32 mx-auto animate-pulse" />,
      title: "✅ LET HIM SHOOT",
      message: "LOW SHOOTING THREAT - FOCUS ELSEWHERE",
    },
    "unknown": {
      bgClass: "bg-gray-600/95",
      icon: <HelpCircle className="w-32 h-32 mx-auto animate-pulse" />,
      title: "❓ UNKNOWN SHOOTER!",
      message: "NO 2024 STATS - PROCEED WITH CAUTION!",
    },
  }

  const { bgClass, icon, title, message } = alertStyles[shooterStatus]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${bgClass} backdrop-blur-sm animate-in fade-in duration-500`}
    >
      <div className="text-center text-white">
        <div className="mb-6">{icon}</div>
        <h1 className="text-6xl md:text-8xl font-bold mb-4 animate-bounce">{title}</h1>
        <p className="text-2xl md:text-4xl font-semibold mb-2">{playerName}</p>
        <p className="text-xl md:text-2xl opacity-90">{message}</p>
      </div>
    </div>
  )
}