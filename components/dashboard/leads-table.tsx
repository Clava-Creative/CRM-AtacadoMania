"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MessageCircle, Eye } from "lucide-react"
import type { Lead, LeadStatus, LeadPriority } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface LeadsTableProps {
  leads: Lead[]
  onViewDetails: (lead: Lead) => void
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  em_atendimento: { label: "Em atendimento", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  convertido: { label: "Convertido", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  perdido: { label: "Perdido", className: "bg-red-100 text-red-700 hover:bg-red-100" },
}

const priorityConfig: Record<LeadPriority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  média: { label: "Media", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  baixa: { label: "Baixa", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
}

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function LeadsTable({ leads, onViewDetails }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-slate-900">Nenhum lead encontrado</p>
        <p className="text-sm text-slate-500">Tente ajustar os filtros de busca</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200">
            <TableHead className="text-slate-600">Status</TableHead>
            <TableHead className="text-slate-600">Nome</TableHead>
            <TableHead className="text-slate-600">Telefone</TableHead>
            <TableHead className="text-slate-600 hidden md:table-cell">Localizacao</TableHead>
            <TableHead className="text-slate-600 hidden lg:table-cell">Tipo de Calcado</TableHead>
            <TableHead className="text-slate-600 hidden lg:table-cell">Volume</TableHead>
            <TableHead className="text-slate-600">Prioridade</TableHead>
            <TableHead className="text-slate-600 hidden sm:table-cell">Data</TableHead>
            <TableHead className="text-slate-600 text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const status = statusConfig[lead.status]
            const priority = priorityConfig[lead.priority]
            const whatsappUrl = `https://wa.me/${formatPhoneForWhatsApp(lead.phone)}`

            return (
              <TableRow key={lead.id} className="border-slate-200 hover:bg-slate-50">
                <TableCell>
                  <Badge variant="secondary" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-slate-900">{lead.name}</TableCell>
                <TableCell>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{lead.phone}</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </a>
                </TableCell>
                <TableCell className="hidden md:table-cell text-slate-600">
                  {lead.city}, {lead.country}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-slate-600">
                  {lead.shoe_type || "-"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-slate-600">
                  {lead.estimated_volume || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={priority.className}>
                    {priority.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-slate-600">
                  {format(new Date(lead.forwarded_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(lead)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Ver detalhes</span>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
