"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface HistoricalShootingChartProps {
  stats: {
    playerId: string;
    year1: number;
    threePtPctYear1: number;
    year2: number;
    threePtPctYear2: number;
    year3: number;
    threePtPctYear3: number;
  }
}

export default function HistoricalShootingChart({ stats }: HistoricalShootingChartProps) {
  const data = [
    {
      name: `${stats.year3}`,
      percentage: stats.threePtPctYear3,
    },
    {
      name: `${stats.year2}`,
      percentage: stats.threePtPctYear2,
    },
    {
      name: `${stats.year1}`,
      percentage: stats.threePtPctYear1,
    },
  ]

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white">3-Point Shooting History</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#fff" />
            <YAxis stroke="#fff" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value: number) => [value.toFixed(1), "3PT Percentage"]}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Bar dataKey="percentage" fill="#ea580c" name="3PT Percentage" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}