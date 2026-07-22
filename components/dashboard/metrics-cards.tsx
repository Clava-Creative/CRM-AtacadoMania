"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, MessageSquare, CheckCircle, TrendingUp } from "lucide-react"
import type { DashboardMetrics } from "@/lib/types"

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: "Leads Novos",
      value: metrics.totalNew,
      icon: Users,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    },
    {
      title: "Em Atendimento",
      value: metrics.totalInProgress,
      icon: MessageSquare,
      color: "bg-amber-500",
      textColor: "text-amber-600",
    },
    {
      title: "Convertidos Hoje",
      value: metrics.convertedToday,
      icon: CheckCircle,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
    {
      title: "Taxa de Conversao",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "bg-slate-500",
      textColor: "text-slate-600",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-500">{card.title}</p>
                <p className={`text-xl sm:text-2xl font-bold ${card.textColor}`}>{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
