"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import type { LeadStatus, LeadPriority, DateFilter } from "@/lib/types"

interface LeadsFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: LeadStatus | "all"
  onStatusChange: (value: LeadStatus | "all") => void
  priorityFilter: LeadPriority | "all"
  onPriorityChange: (value: LeadPriority | "all") => void
  dateFilter: DateFilter
  onDateChange: (value: DateFilter) => void
}

export function LeadsFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  dateFilter,
  onDateChange,
}: LeadsFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-slate-300"
        />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as LeadStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40 border-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="novo">Novo</SelectItem>
            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
            <SelectItem value="convertido">Convertido</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => onPriorityChange(v as LeadPriority | "all")}>
          <SelectTrigger className="w-full sm:w-36 border-slate-300">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="média">Media</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={(v) => onDateChange(v as DateFilter)}>
          <SelectTrigger className="w-full sm:w-40 border-slate-300">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">Ultimos 7 dias</SelectItem>
            <SelectItem value="30days">Ultimos 30 dias</SelectItem>
            <SelectItem value="custom">Todo o periodo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
