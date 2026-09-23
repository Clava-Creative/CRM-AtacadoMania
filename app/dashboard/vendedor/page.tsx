'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

// Lojas do grupo. A chave é o valor gravado na coluna "loja" do Supabase.
const LOJAS: Record<string, { nome: string; cor: string }> = {
  atacado_mania: { nome: 'Atacado Mania', cor: '#2F5D8C' },
  calcados_online: { nome: 'Calçados Online', cor: '#B45309' },
  calce_mania: { nome: 'Calce Mania', cor: '#0F6E70' },
}

const C = {
  fundo: '#F6F4F0',
  superficie: '#FFFFFF',
  superficieAlt: '#FBFAF8',
  borda: '#E3DFD8',
  bordaClara: '#EDEAE4',
  bordaBotao: '#CFC9C0',
  tinta: '#1C1B18',
  texto: '#4A463F',
  suave: '#6B6760',
  verde: '#1F7A4D',
  neutro: '#C7C1B7',
}

function nomeLoja(loja: string) {
  return LOJAS[loja]?.nome || loja
}

function corLoja(loja: string) {
  return LOJAS[loja]?.cor || '#6B6760'
}

export default function VendedorDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = getSupabase()

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      const storedSession = localStorage.getItem('supabase.auth.token')
      const storedEmail = localStorage.getItem('user_email')

      if (storedSession && storedEmail) {
        try {
          const parsedSession = JSON.parse(storedSession)
          await supabase.auth.setSession(parsedSession)
          const userData = await checkUserRole(storedEmail)
          if (!userData || userData.role !== 'vendedor') {
            window.location.href = '/dashboard'
            return
          }
          setUser({ ...parsedSession.user, vendedor_nome: userData.vendedor_nome })
          await loadLeads(userData.vendedor_nome)
          setLoading(false)
          return
        } catch (e) {
          localStorage.removeItem('supabase.auth.token')
          localStorage.removeItem('user_email')
        }
      }

      window.location.href = '/login'
      return
    }

    const userData = await checkUserRole(session.user.email)
    if (!userData || userData.role !== 'vendedor') {
      window.location.href = '/dashboard'
      return
    }

    setUser({ ...session.user, vendedor_nome: userData.vendedor_nome })
    await loadLeads(userData.vendedor_nome)
    setLoading(false)
  }

  async function checkUserRole(email: string | undefined) {
    if (!email) return null
    const supabase = getSupabase()
    const { data } = await supabase
      .from('crm_users')
      .select('role, vendedor_nome')
      .eq('email', email)
      .single()
    return data
  }

  async function loadLeads(vendedorNome: string) {
    const supabase = getSupabase()

    // Buscar leads apenas do vendedor logado
    const { data: atacado } = await supabase
      .from('distribuicao_vendedores')
      .select('*')
      .eq('vendedor_nome', vendedorNome)
      .order('data_encaminhamento', { ascending: false })

    const { data: varejo } = await supabase
      .from('distribuicao_vendedores_varejo')
      .select('*')
      .eq('vendedor_nome', vendedorNome)
      .order('data_encaminhamento', { ascending: false })

    const allLeads = [
      ...(atacado || []).map(item => ({
        ...item,
        id: `atacado-${item.id}`,
        lead_id: item.id,
        lead_type: 'atacado',
        tipo: 'Atacado',
        // A tabela de atacado não tem coluna "loja": é sempre Atacado Mania
        loja: 'atacado_mania',
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento
      })),
      ...(varejo || []).map(item => ({
        ...item,
        id: `varejo-${item.id}`,
        lead_id: item.id,
        lead_type: 'varejo',
        tipo: 'Varejo',
        loja: item.loja || 'atacado_mania',
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento
      }))
    ]

    // Mais recentes primeiro
    allLeads.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

    setLeads(allLeads)
  }

  async function updateTracking(lead: any, field: 'respondido' | 'convertido', value: boolean) {
    const supabase = getSupabase()

    const updateData: any = { [field]: value }

    if (field === 'respondido' && value) {
      updateData.data_resposta = new Date().toISOString()
    }
    if (field === 'convertido' && value) {
      updateData.data_conversao = new Date().toISOString()
    }

    const tableName = lead.lead_type === 'atacado'
      ? 'distribuicao_vendedores'
      : 'distribuicao_vendedores_varejo'

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', lead.lead_id)

    if (!error) {
      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, ...updateData } : l
      ))
    }
  }

  async function handleLogout() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    localStorage.removeItem('supabase.auth.token')
    localStorage.removeItem('user_email')
    window.location.href = '/login'
  }

  function toggleLead(leadId: string) {
    setExpandedLeads(prev => {
      const novo = new Set(prev)
      novo.has(leadId) ? novo.delete(leadId) : novo.add(leadId)
      return novo
    })
  }

  // Filtro por período
  const leadsPorPeriodo = mostrarTodos ? leads : leads.filter(lead => {
    if (!dataInicio && !dataFim) {
      const hoje = new Date()
      const dataLead = new Date(lead.data)
      return dataLead.getMonth() === hoje.getMonth() && dataLead.getFullYear() === hoje.getFullYear()
    }

    const dataLead = new Date(lead.data)
    const dataLeadSemHora = new Date(dataLead.getFullYear(), dataLead.getMonth(), dataLead.getDate())

    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio + 'T00:00:00')
      const fim = new Date(dataFim + 'T23:59:59')
      return dataLeadSemHora >= new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()) &&
             dataLeadSemHora <= new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
    } else if (dataInicio) {
      const inicio = new Date(dataInicio + 'T00:00:00')
      return dataLeadSemHora >= new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
    } else if (dataFim) {
      const fim = new Date(dataFim + 'T23:59:59')
      return dataLeadSemHora <= new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
    }
    return true
  })

  // Filtro por busca
  const leadsExibidos = leadsPorPeriodo.filter(lead => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      lead.cliente?.toLowerCase().includes(termo) ||
      lead.telefone?.toLowerCase().includes(termo) ||
      lead.cidade?.toLowerCase().includes(termo) ||
      lead.interesse?.toLowerCase().includes(termo)
    )
  })

  const totalRespondidos = leadsExibidos.filter(l => l.respondido).length
  const totalConvertidos = leadsExibidos.filter(l => l.convertido).length
  const aguardando = leadsExibidos.length - totalRespondidos
  const taxaResposta = leadsExibidos.length > 0
    ? ((totalRespondidos / leadsExibidos.length) * 100).toFixed(1)
    : '0'
  const taxaConversao = leadsExibidos.length > 0
    ? ((totalConvertidos / leadsExibidos.length) * 100).toFixed(1)
    : '0'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.fundo }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.tinta }} />
      </div>
    )
  }

  const botaoBase = 'text-sm font-medium rounded-md px-4 py-2 min-h-[40px]'

  return (
    <div className="min-h-screen" style={{ background: C.fundo, color: C.tinta }}>
      <header style={{ background: C.superficie, borderBottom: `1px solid ${C.borda}` }}>
        <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold tracking-tight">Meus leads</span>
            <span className="text-[13px]" style={{ color: C.suave }}>{user?.vendedor_nome}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] hidden sm:inline" style={{ color: C.suave }}>{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className={botaoBase}
              style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* Busca e período */}
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Buscar por cliente, telefone, cidade ou interesse"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full text-sm rounded-md px-4 py-3 min-h-[44px] focus:outline-none"
            style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}`, color: C.tinta }}
          />

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="inicio" className="text-xs font-semibold" style={{ color: C.suave }}>Início</label>
              <input
                id="inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setMostrarTodos(false) }}
                className="text-[13px] rounded-md px-3 py-2 min-h-[40px]"
                style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}`, color: C.tinta }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="fim" className="text-xs font-semibold" style={{ color: C.suave }}>Fim</label>
              <input
                id="fim"
                type="date"
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setMostrarTodos(false) }}
                className="text-[13px] rounded-md px-3 py-2 min-h-[40px]"
                style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}`, color: C.tinta }}
              />
            </div>
            <button
              type="button"
              onClick={() => { setDataInicio(''); setDataFim(''); setMostrarTodos(false) }}
              className={botaoBase}
              style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
            >
              Mês atual
            </button>
            <button
              type="button"
              onClick={() => { setDataInicio(''); setDataFim(''); setMostrarTodos(true) }}
              className={botaoBase}
              style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
            >
              Tudo
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 rounded-[10px] overflow-hidden"
          style={{ background: C.superficie, border: `1px solid ${C.borda}` }}
        >
          <div className="px-5 py-4 flex flex-col gap-1" style={{ borderRight: `1px solid ${C.borda}`, borderBottom: `1px solid ${C.borda}` }}>
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Leads no período</span>
            <span className="text-3xl font-bold tracking-tight">{leadsExibidos.length}</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-1" style={{ borderRight: `1px solid ${C.borda}`, borderBottom: `1px solid ${C.borda}` }}>
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Aguardando resposta</span>
            <span className="text-3xl font-bold tracking-tight">{aguardando}</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-1" style={{ borderRight: `1px solid ${C.borda}` }}>
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Respondidos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight" style={{ color: C.verde }}>{totalRespondidos}</span>
              <span className="text-[13px]" style={{ color: C.suave }}>{taxaResposta}%</span>
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-1">
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Convertidos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{totalConvertidos}</span>
              <span className="text-[13px]" style={{ color: C.suave }}>{taxaConversao}%</span>
            </div>
          </div>
        </div>

        {/* Lista de leads */}
        <div className="rounded-[10px] overflow-hidden" style={{ background: C.superficie, border: `1px solid ${C.borda}` }}>
          {leadsExibidos.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: C.suave }}>
              Nenhum lead no período selecionado
            </p>
          ) : (
            leadsExibidos.map((lead, indice) => {
              const aberto = expandedLeads.has(lead.id)
              return (
                <div
                  key={lead.id}
                  style={{
                    background: aberto ? C.superficieAlt : C.superficie,
                    borderTop: indice === 0 ? 'none' : `1px solid ${C.bordaClara}`
                  }}
                >
                  <div className="flex items-center gap-3 px-4 md:px-6 py-3">
                    <span
                      className="w-[7px] h-[7px] rounded-full shrink-0"
                      style={{ background: lead.respondido ? C.verde : C.neutro }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold truncate">{lead.cliente || 'Sem nome'}</span>
                        <span
                          className="text-[11px] font-semibold rounded px-[7px] py-[3px] text-white shrink-0"
                          style={{ background: corLoja(lead.loja) }}
                        >
                          {nomeLoja(lead.loja)}
                        </span>
                        {lead.convertido && (
                          <span className="text-[11px] font-semibold rounded px-[6px] py-[2px] text-white shrink-0" style={{ background: C.verde }}>
                            Convertido
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] truncate" style={{ color: C.texto }}>
                        {[lead.telefone, lead.cidade, lead.interesse].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <span className="text-xs shrink-0 hidden sm:inline" style={{ color: C.suave }}>
                      {new Date(lead.data).toLocaleDateString('pt-BR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLead(lead.id)}
                      aria-label={`${aberto ? 'Fechar' : 'Abrir'} detalhes de ${lead.cliente || 'lead'}`}
                      className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md"
                      style={aberto
                        ? { background: C.tinta, border: `1px solid ${C.tinta}` }
                        : { background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={aberto ? '#FFFFFF' : C.texto} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={aberto ? 'M1.5 3 L5 7 L8.5 3' : 'M3 1.5 L7 5 L3 8.5'} />
                      </svg>
                    </button>
                  </div>

                  {aberto && (
                    <div className="px-4 md:px-6 pb-5 flex flex-col gap-4">
                      <div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 px-5 py-4 rounded-lg"
                        style={{ background: C.superficie, border: `1px solid ${C.borda}` }}
                      >
                        <Campo rotulo="Telefone" valor={lead.telefone} />
                        <Campo rotulo="Cidade" valor={lead.cidade} />
                        <Campo rotulo="Idioma" valor={lead.lead_idioma} />
                        <Campo rotulo="Tipo de calçado" valor={lead.interesse_tipo_calcado} />
                        <Campo rotulo="Marcas" valor={lead.interesse_marcas_interesse} />
                        <Campo rotulo="Já revende" valor={lead.interesse_ja_revende} />
                        <Campo rotulo="Volume estimado" valor={lead.interesse_volume_estimado} />
                        <Campo rotulo="Urgência" valor={lead.interesse_urgencia} />
                        <Campo rotulo="Recebido em" valor={new Date(lead.data).toLocaleDateString('pt-BR')} />
                        {lead.contexto_resumo_conversa && (
                          <div className="sm:col-span-2 md:col-span-3 flex flex-col gap-1 pt-1" style={{ borderTop: `1px solid ${C.bordaClara}` }}>
                            <span className="text-[11px] font-semibold" style={{ color: C.suave }}>Resumo</span>
                            <span className="text-[13px] leading-relaxed">{lead.contexto_resumo_conversa}</span>
                          </div>
                        )}
                        {lead.contexto_perguntas_cliente && (
                          <div className="sm:col-span-2 md:col-span-3 flex flex-col gap-1">
                            <span className="text-[11px] font-semibold" style={{ color: C.suave }}>Perguntas do cliente</span>
                            <span className="text-[13px] leading-relaxed">{lead.contexto_perguntas_cliente}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <input
                              id={`resp-${lead.id}`}
                              type="checkbox"
                              checked={lead.respondido || false}
                              onChange={(e) => updateTracking(lead, 'respondido', e.target.checked)}
                              className="w-4 h-4"
                              style={{ accentColor: C.verde }}
                            />
                            <label htmlFor={`resp-${lead.id}`} className="text-[13px]">Respondido</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id={`conv-${lead.id}`}
                              type="checkbox"
                              checked={lead.convertido || false}
                              onChange={(e) => updateTracking(lead, 'convertido', e.target.checked)}
                              className="w-4 h-4"
                              style={{ accentColor: C.verde }}
                            />
                            <label htmlFor={`conv-${lead.id}`} className="text-[13px]">Convertido</label>
                          </div>
                        </div>
                        {lead.telefone && (
                          <a
                            href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-semibold rounded-md px-4 py-2 min-h-[44px] inline-flex items-center no-underline"
                            style={{ background: C.tinta, color: '#FFFFFF' }}
                          >
                            Abrir no WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-5 text-xs" style={{ color: C.suave }}>
          <div className="flex items-center gap-2">
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: C.verde }} />
            <span>Respondido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: C.neutro }} />
            <span>Aguardando resposta</span>
          </div>
        </div>

      </main>
    </div>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold" style={{ color: '#6B6760' }}>{rotulo}</span>
      <span className="text-[13px]">{valor}</span>
    </div>
  )
}
