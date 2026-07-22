"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Phone,
  MapPin,
  Globe,
  Languages,
  Shirt,
  Tag,
  Store,
  Package,
  Clock,
  MessageSquare,
  HelpCircle,
  Filter,
  Calendar,
  MessageCircle,
  Loader2,
  Save,
} from "lucide-react"
import type { Lead, LeadHistory, LeadStatus, LeadPriority } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase" // Import createClient

interface LeadDetailsModalProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-emerald-100 text-emerald-700" },
  em_atendimento: { label: "Em atendimento", className: "bg-amber-100 text-amber-700" },
  convertido: { label: "Convertido", className: "bg-blue-100 text-blue-700" },
  perdido: { label: "Perdido", className: "bg-red-100 text-red-700" },
}

const priorityConfig: Record<LeadPriority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-red-100 text-red-700" },
  média: { label: "Media", className: "bg-amber-100 text-amber-700" },
  baixa: { label: "Baixa", className: "bg-slate-100 text-slate-700" },
}

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function LeadDetailsModal({ lead, open, onClose, onUpdate }: LeadDetailsModalProps) {
  const [status, setStatus] = useState<LeadStatus>("novo")
  const [priority, setPriority] = useState<LeadPriority>("média")
  const [notes, setNotes] = useState("")
  const [history, setHistory] = useState<LeadHistory[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  const supabase = getSupabase()

  useEffect(() => {
    if (lead) {
      setStatus(lead.status)
      setPriority(lead.priority)
      setNotes(lead.notes || "")
      fetchHistory(lead.id)
    }
  }, [lead])

  const fetchHistory = async (leadId: string) => {
    setIsLoadingHistory(true)
    const { data } = await supabase
      .from("lead_history")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
    
    if (data) setHistory(data)
    setIsLoadingHistory(false)
  }

  const handleSave = async () => {
    if (!lead) return
    
    setIsSaving(true)
    
    try {
      const updates: Partial<Lead> = {}
      const historyEntries: Omit<LeadHistory, "id" | "created_at">[] = []

      // Track changes
      if (status !== lead.status) {
        updates.status = status
        if (status === "convertido") {
          updates.converted_at = new Date().toISOString()
        }
        historyEntries.push({
          lead_id: lead.id,
          action: "status_change",
          old_value: lead.status,
          new_value: status,
          performed_by: null,
        })
      }

      if (priority !== lead.priority) {
        updates.priority = priority
        historyEntries.push({
          lead_id: lead.id,
          action: "priority_change",
          old_value: lead.priority,
          new_value: priority,
          performed_by: null,
        })
      }

      if (notes !== (lead.notes || "")) {
        updates.notes = notes
        historyEntries.push({
          lead_id: lead.id,
          action: "note_updated",
          old_value: lead.notes,
          new_value: notes,
          performed_by: null,
        })
      }

      // Update lead
      if (Object.keys(updates).length > 0) {
        await supabase
          .from("leads")
          .update(updates)
          .eq("id", lead.id)
      }

      // Insert history entries
      if (historyEntries.length > 0) {
        await supabase.from("lead_history").insert(historyEntries)
      }

      onUpdate()
      fetchHistory(lead.id)
    } catch (error) {
      console.error("Error saving lead:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!lead) return null

  const whatsappUrl = `https://wa.me/${formatPhoneForWhatsApp(lead.phone)}`

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      status_change: "Status alterado",
      priority_change: "Prioridade alterada",
      note_updated: "Nota atualizada",
      note_added: "Nota adicionada",
    }
    return labels[action] || action
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
            Detalhes do Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informacoes do Cliente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{lead.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:underline"
                >
                  {lead.phone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{lead.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{lead.country}</span>
              </div>
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{lead.language}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Interest Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Interesse
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shirt className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Tipo de calcado</p>
                  <p className="text-sm text-slate-600">{lead.shoe_type || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Marcas de interesse</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lead.brands_of_interest?.map((brand) => (
                      <Badge key={brand} variant="secondary" className="text-xs bg-slate-200 text-slate-700">
                        {brand}
                      </Badge>
                    )) || <span className="text-sm text-slate-600">-</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Store className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Ja revende?</p>
                  <p className="text-sm text-slate-600">{lead.already_resells ? "Sim" : "Nao"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Volume estimado</p>
                  <p className="text-sm text-slate-600">{lead.estimated_volume || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Urgencia</p>
                  <p className="text-sm text-slate-600 capitalize">{lead.urgency}</p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Conversation Context */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Contexto da Conversa
            </h3>
            <div className="space-y-4 bg-slate-50 rounded-lg p-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <p className="text-xs text-slate-500">Resumo da conversa</p>
                </div>
                <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                  {lead.conversation_summary || "Nenhum resumo disponivel"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  <p className="text-xs text-slate-500">Perguntas do cliente</p>
                </div>
                <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                  {lead.client_questions || "Nenhuma pergunta registrada"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Filter className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Etapa do funil</p>
                    <p className="text-sm text-slate-600 capitalize">{lead.funnel_stage}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Data de qualificacao</p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(lead.qualification_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Management */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Gestao</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={config.className}>
                              {config.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={config.className}>
                              {config.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Notas</Label>
                <Textarea
                  placeholder="Adicione suas notas sobre este lead..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-24 border-slate-300"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar alteracoes
                  </>
                )}
              </Button>
            </div>
          </section>

          <Separator />

          {/* History */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Historico de acoes</h3>
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma acao registrada</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div className="flex-1">
                      <p className="text-slate-700">{getActionLabel(item.action)}</p>
                      {item.old_value && item.new_value && (
                        <p className="text-xs text-slate-500">
                          {item.old_value} → {item.new_value}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* WhatsApp Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="mr-2 h-5 w-5" />
              Abrir WhatsApp
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
