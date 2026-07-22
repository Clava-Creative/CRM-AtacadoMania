export type LeadStatus = 'novo' | 'em_atendimento' | 'convertido' | 'perdido'
export type LeadPriority = 'alta' | 'média' | 'baixa'

export interface Seller {
  id: string
  email: string
  name: string
  auth_user_id: string | null
  created_at: string
}

export interface Lead {
  id: string
  seller_id: string
  name: string
  phone: string
  city: string | null
  country: string | null
  language: string
  shoe_type: string | null
  brands_of_interest: string[] | null
  already_resells: boolean
  estimated_volume: string | null
  urgency: string
  conversation_summary: string | null
  client_questions: string | null
  funnel_stage: string
  qualification_date: string
  status: LeadStatus
  priority: LeadPriority
  notes: string | null
  forwarded_at: string
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface LeadHistory {
  id: string
  lead_id: string
  action: string
  old_value: string | null
  new_value: string | null
  performed_by: string | null
  created_at: string
}

export interface DashboardMetrics {
  totalNew: number
  totalInProgress: number
  convertedToday: number
  conversionRate: number
}

export type DateFilter = 'today' | '7days' | '30days' | 'custom'
