'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Lojas do grupo. A chave é o valor gravado na coluna "loja" do Supabase.
const LOJAS: Record<string, { nome: string; cor: string }> = {
  atacado_mania: { nome: 'Atacado Mania', cor: '#2F5D8C' },
  calcados_online: { nome: 'Calçados Online', cor: '#B45309' },
  calce_mania: { nome: 'Calce Mania', cor: '#0F6E70' },
}

// Paleta
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

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [expandedVendedores, setExpandedVendedores] = useState<Set<string>>(new Set())
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set())
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [lojaFiltro, setLojaFiltro] = useState('todas')

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
          const userData = await checkUserRole(parsedSession.user?.email)
          if (userData?.role === 'vendedor') {
            window.location.href = '/dashboard/vendedor'
            return
          }
          setUser({ ...parsedSession.user, role: userData?.role })
          await loadLeads(parsedSession.user?.id)
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
    if (userData?.role === 'vendedor') {
      window.location.href = '/dashboard/vendedor'
      return
    }

    setUser({ ...session.user, role: userData?.role, vendedor_nome: userData?.vendedor_nome })
    await loadLeads(session.user.id)
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

  async function loadLeads(userId: string) {
    const supabase = getSupabase()

    const { data: atacado } = await supabase
      .from('distribuicao_vendedores')
      .select('*')
      .order('data_encaminhamento', { ascending: false })

    const { data: varejo } = await supabase
      .from('distribuicao_vendedores_varejo')
      .select('*')
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
        vendedor: item.vendedor_nome,
        vendedor_telefone: item.vendedor_telefone,
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento,
        respondido: item.respondido || false,
        convertido: item.convertido || false,
        data_resposta: item.data_resposta,
        data_conversao: item.data_conversao
      })),
      ...(varejo || []).map(item => ({
        ...item,
        id: `varejo-${item.id}`,
        lead_id: item.id,
        lead_type: 'varejo',
        tipo: 'Varejo',
        loja: item.loja || 'atacado_mania',
        vendedor: item.vendedor_nome,
        vendedor_telefone: item.vendedor_telefone,
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento,
        respondido: item.respondido || false,
        convertido: item.convertido || false,
        data_resposta: item.data_resposta,
        data_conversao: item.data_conversao
      }))
    ]

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

  function toggleVendedor(vendedor: string) {
    setExpandedVendedores(prev => {
      const novo = new Set(prev)
      novo.has(vendedor) ? novo.delete(vendedor) : novo.add(vendedor)
      return novo
    })
  }

  function toggleLead(leadId: string) {
    setExpandedLeads(prev => {
      const novo = new Set(prev)
      novo.has(leadId) ? novo.delete(leadId) : novo.add(leadId)
      return novo
    })
  }

  function exportarRelatorioVendedor(vendedor: string) {
    const vendedorLeads = leadsPorVendedor[vendedor]
    const respondidos = vendedorLeads.filter(l => l.respondido).length
    const convertidos = vendedorLeads.filter(l => l.convertido).length
    const taxaConversao = respondidos > 0 ? ((convertidos / respondidos) * 100).toFixed(1) : '0'

    const periodo = mostrarTodos
      ? 'Todos os Leads'
      : (dataInicio && dataFim
        ? `${new Date(dataInicio).toLocaleDateString('pt-BR')} - ${new Date(dataFim).toLocaleDateString('pt-BR')}`
        : 'Mês Atual')

    const lojaTexto = lojaFiltro === 'todas' ? 'Todas as lojas' : nomeLoja(lojaFiltro)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1C1B18; }
          h1 { margin-bottom: 5px; }
          .periodo { color: #6B6760; font-size: 14px; margin-bottom: 20px; }
          .metricas { display: flex; gap: 20px; margin: 20px 0; }
          .metrica { background: #F6F4F0; padding: 15px; border-radius: 8px; flex: 1; }
          .metrica-label { font-size: 12px; color: #6B6760; }
          .metrica-valor { font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1C1B18; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #E3DFD8; }
          tr:nth-child(even) { background: #FBFAF8; }
          .sim { color: #1F7A4D; font-weight: bold; }
          .nao { color: #6B6760; }
        </style>
      </head>
      <body>
        <h1>Relatório de Leads - ${vendedor}</h1>
        <div class="periodo">Período: ${periodo} &nbsp;|&nbsp; Loja: ${lojaTexto}</div>

        <div class="metricas">
          <div class="metrica">
            <div class="metrica-label">Total de Leads</div>
            <div class="metrica-valor">${vendedorLeads.length}</div>
          </div>
          <div class="metrica">
            <div class="metrica-label">Respondidos</div>
            <div class="metrica-valor">${respondidos} (${((respondidos / vendedorLeads.length) * 100).toFixed(0)}%)</div>
          </div>
          <div class="metrica">
            <div class="metrica-label">Convertidos</div>
            <div class="metrica-valor">${convertidos} (${((convertidos / vendedorLeads.length) * 100).toFixed(0)}%)</div>
          </div>
          <div class="metrica">
            <div class="metrica-label">Taxa de Conversão</div>
            <div class="metrica-valor">${taxaConversao}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Cidade</th>
              <th>Loja</th>
              <th>Data</th>
              <th>Respondido</th>
              <th>Convertido</th>
            </tr>
          </thead>
          <tbody>
            ${vendedorLeads.map(lead => `
              <tr>
                <td>${lead.cliente || '-'}</td>
                <td>${lead.telefone || '-'}</td>
                <td>${lead.cidade || '-'}</td>
                <td>${nomeLoja(lead.loja)}</td>
                <td>${new Date(lead.data).toLocaleDateString('pt-BR')}</td>
                <td class="${lead.respondido ? 'sim' : 'nao'}">${lead.respondido ? 'Sim' : 'Não'}</td>
                <td class="${lead.convertido ? 'sim' : 'nao'}">${lead.convertido ? 'Sim' : 'Não'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 250)
    }
  }

  // Filtro por período
  const leadsPeriodo = mostrarTodos ? leads : leads.filter(lead => {
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

  // Filtro por loja
  const leadsFiltrados = lojaFiltro === 'todas'
    ? leadsPeriodo
    : leadsPeriodo.filter(lead => lead.loja === lojaFiltro)

  // Vendedores que saíram da empresa
  const vendedoresInativos = ['Sandra Elena', 'Armando', 'Magdalena', 'Maria', 'Natália', 'Ana Gabriela']

  const leadsAtivos = leadsFiltrados.filter(lead =>
    !vendedoresInativos.some(nome =>
      lead.vendedor?.toLowerCase().trim() === nome.toLowerCase().trim()
    )
  )

  const leadsPorVendedor = leadsAtivos.reduce((acc, lead) => {
    if (!acc[lead.vendedor]) acc[lead.vendedor] = []
    acc[lead.vendedor].push(lead)
    return acc
  }, {} as Record<string, any[]>)

  // Ordena por volume, do maior para o menor
  const vendedores = Object.keys(leadsPorVendedor).sort(
    (a, b) => leadsPorVendedor[b].length - leadsPorVendedor[a].length
  )

  const maiorVolume = vendedores.length > 0 ? leadsPorVendedor[vendedores[0]].length : 0

  const totalRespondidos = leadsAtivos.filter(l => l.respondido).length
  const totalConvertidos = leadsAtivos.filter(l => l.convertido).length
  const taxaResposta = leadsAtivos.length > 0
    ? ((totalRespondidos / leadsAtivos.length) * 100).toFixed(1)
    : '0'
  const taxaConversao = leadsAtivos.length > 0
    ? ((totalConvertidos / leadsAtivos.length) * 100).toFixed(1)
    : '0'

  const totaisPorLoja = Object.keys(LOJAS).reduce((acc, loja) => {
    acc[loja] = leadsPeriodo.filter(l => l.loja === loja).length
    return acc
  }, {} as Record<string, number>)

  // Loja predominante de cada vendedor (para a cor da barra e a etiqueta)
  function lojaDoVendedor(lista: any[]) {
    const contagem = lista.reduce((acc: Record<string, number>, l) => {
      acc[l.loja] = (acc[l.loja] || 0) + 1
      return acc
    }, {})
    return Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a])[0] || 'atacado_mania'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.fundo }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.tinta }} />
      </div>
    )
  }

  const botaoBase = 'text-sm font-medium rounded-md px-4 py-2 min-h-[40px] transition-colors'

  return (
    <div className="min-h-screen" style={{ background: C.fundo, color: C.tinta }}>
      <header style={{ background: C.superficie, borderBottom: `1px solid ${C.borda}` }}>
        <div className="mx-auto max-w-[1440px] px-10 h-[68px] flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-bold tracking-tight">Atacado Mania</span>
            <span className="text-[13px]" style={{ color: C.suave }}>Distribuição de leads</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px]" style={{ color: C.suave }}>{user?.email}</span>
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

      <main className="mx-auto max-w-[1440px] px-10 py-6 flex flex-col gap-5">

        {/* Filtros */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Loja</span>
            <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ background: C.bordaClara }}>
              <button
                type="button"
                onClick={() => setLojaFiltro('todas')}
                className="text-[13px] font-semibold rounded-md px-4 py-2 min-h-[40px]"
                style={lojaFiltro === 'todas'
                  ? { background: C.tinta, color: '#FFFFFF' }
                  : { background: 'transparent', color: C.texto }}
              >
                Todas <span style={{ opacity: 0.65 }}>{leadsPeriodo.length}</span>
              </button>
              {Object.entries(LOJAS).map(([chave, info]) => (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setLojaFiltro(chave)}
                  className="text-[13px] font-medium rounded-md px-4 py-2 min-h-[40px]"
                  style={lojaFiltro === chave
                    ? { background: C.tinta, color: '#FFFFFF' }
                    : { background: 'transparent', color: C.texto }}
                >
                  {info.nome}{' '}
                  <span style={{ opacity: lojaFiltro === chave ? 0.65 : 1, color: lojaFiltro === chave ? '#FFFFFF' : '#8A8478' }}>
                    {totaisPorLoja[chave] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
          <div className="px-6 py-[18px] flex flex-col gap-1" style={{ borderRight: `1px solid ${C.borda}` }}>
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Leads no período</span>
            <span className="text-3xl font-bold tracking-tight">{leadsAtivos.length}</span>
          </div>
          <div className="px-6 py-[18px] flex flex-col gap-1" style={{ borderRight: `1px solid ${C.borda}` }}>
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Respondidos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight" style={{ color: C.verde }}>{totalRespondidos}</span>
              <span className="text-[13px]" style={{ color: C.suave }}>{taxaResposta}%</span>
            </div>
          </div>
          <div className="px-6 py-[18px] flex flex-col gap-1" style={{ borderRight: `1px solid ${C.borda}` }}>
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Convertidos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{totalConvertidos}</span>
              <span className="text-[13px]" style={{ color: C.suave }}>{taxaConversao}%</span>
            </div>
          </div>
          <div className="px-6 py-[18px] flex flex-col gap-1">
            <span className="text-xs font-semibold" style={{ color: C.suave }}>Vendedores ativos</span>
            <span className="text-3xl font-bold tracking-tight">{vendedores.length}</span>
          </div>
        </div>

        {/* Tabela de vendedores */}
        <div className="rounded-[10px] overflow-hidden" style={{ background: C.superficie, border: `1px solid ${C.borda}` }}>

          <div
            className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold"
            style={{ background: C.superficieAlt, borderBottom: `1px solid ${C.borda}`, color: C.suave }}
          >
            <span className="col-span-4">Vendedor</span>
            <span className="col-span-3">Volume</span>
            <span className="col-span-1 text-right">Leads</span>
            <span className="col-span-1 text-right">Resp.</span>
            <span className="col-span-1 text-right">Conv.</span>
            <span className="col-span-2 text-right">Relatório</span>
          </div>

          {vendedores.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: C.suave }}>Nenhum lead no período</p>
          ) : (
            vendedores.map((vendedor) => {
              const vendedorLeads = leadsPorVendedor[vendedor]
              const aberto = expandedVendedores.has(vendedor)
              const respondidos = vendedorLeads.filter(l => l.respondido).length
              const convertidos = vendedorLeads.filter(l => l.convertido).length
              const loja = lojaDoVendedor(vendedorLeads)
              const largura = maiorVolume > 0 ? (vendedorLeads.length / maiorVolume) * 100 : 0

              return (
                <div key={vendedor}>
                  <div
                    className="grid grid-cols-12 gap-4 items-center px-6 py-3.5"
                    style={{ borderBottom: `1px solid ${C.bordaClara}`, background: aberto ? C.superficieAlt : C.superficie }}
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleVendedor(vendedor)}
                        aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${vendedor}`}
                        className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md"
                        style={aberto
                          ? { background: C.tinta, border: `1px solid ${C.tinta}` }
                          : { background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={aberto ? '#FFFFFF' : C.texto} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={aberto ? 'M1.5 3 L5 7 L8.5 3' : 'M3 1.5 L7 5 L3 8.5'} />
                        </svg>
                      </button>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold truncate">{vendedor}</span>
                        <span className="text-xs" style={{ color: C.suave }}>{vendedorLeads[0]?.vendedor_telefone}</span>
                      </div>
                      <span
                        className="text-[11px] font-semibold rounded px-[7px] py-[3px] text-white shrink-0"
                        style={{ background: corLoja(loja) }}
                      >
                        {nomeLoja(loja)}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.bordaClara }}>
                        <div className="h-2" style={{ width: `${largura}%`, background: corLoja(loja) }} />
                      </div>
                    </div>
                    <span className="col-span-1 text-right text-[15px] font-semibold">{vendedorLeads.length}</span>
                    <span className="col-span-1 text-right text-[15px] font-semibold" style={{ color: C.verde }}>{respondidos}</span>
                    <span className="col-span-1 text-right text-[15px] font-semibold">{convertidos}</span>
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => exportarRelatorioVendedor(vendedor)}
                        className="text-xs font-medium rounded-md px-3 py-2 min-h-[36px]"
                        style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
                      >
                        PDF
                      </button>
                    </div>
                  </div>

                  {aberto && (
                    <div style={{ borderBottom: `1px solid ${C.bordaClara}` }}>
                      {vendedorLeads.map((lead) => {
                        const leadAberto = expandedLeads.has(lead.id)
                        return (
                          <div key={lead.id} style={{ background: leadAberto ? C.superficieAlt : C.superficie }}>
                            <div
                              className="grid grid-cols-12 gap-4 items-center py-3 pr-6 pl-16"
                              style={{ borderTop: `1px solid #F1EEE9` }}
                            >
                              <div className="col-span-3 flex items-center gap-2 min-w-0">
                                <span
                                  className="w-[7px] h-[7px] rounded-full shrink-0"
                                  style={{ background: lead.respondido ? C.verde : C.neutro }}
                                />
                                <span className="text-sm font-semibold truncate">{lead.cliente || 'Sem nome'}</span>
                              </div>
                              <span className="col-span-3 text-[13px] truncate" style={{ color: C.texto }}>{lead.telefone}</span>
                              <span className="col-span-3 text-[13px] truncate" style={{ color: C.texto }}>
                                {[lead.cidade, lead.interesse].filter(Boolean).join(' · ')}
                              </span>
                              <div className="col-span-2 flex items-center gap-2">
                                <span className="text-xs" style={{ color: C.suave }}>
                                  {new Date(lead.data).toLocaleDateString('pt-BR')}
                                </span>
                                {lead.convertido && (
                                  <span className="text-[11px] font-semibold rounded px-[6px] py-[2px] text-white" style={{ background: C.verde }}>
                                    Convertido
                                  </span>
                                )}
                              </div>
                              <div className="col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => toggleLead(lead.id)}
                                  aria-label={`${leadAberto ? 'Fechar' : 'Abrir'} detalhes de ${lead.cliente || 'lead'}`}
                                  className="w-7 h-7 flex items-center justify-center rounded-md"
                                  style={leadAberto
                                    ? { background: C.tinta, border: `1px solid ${C.tinta}` }
                                    : { background: C.superficie, border: `1px solid ${C.bordaBotao}` }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={leadAberto ? '#FFFFFF' : C.texto} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d={leadAberto ? 'M1.5 3 L5 7 L8.5 3' : 'M3 1.5 L7 5 L3 8.5'} />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {leadAberto && (
                              <div className="pt-1 pb-5 pr-6 pl-16 flex flex-col gap-4">
                                <div
                                  className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 px-5 py-4 rounded-lg"
                                  style={{ background: C.superficie, border: `1px solid ${C.borda}` }}
                                >
                                  <Campo rotulo="Loja" valor={nomeLoja(lead.loja)} />
                                  <Campo rotulo="Cidade" valor={lead.cidade} />
                                  <Campo rotulo="Idioma" valor={lead.lead_idioma} />
                                  <Campo rotulo="Tipo de calçado" valor={lead.interesse_tipo_calcado} />
                                  <Campo rotulo="Marcas" valor={lead.interesse_marcas_interesse} />
                                  <Campo rotulo="Já revende" valor={lead.interesse_ja_revende} />
                                  <Campo rotulo="Volume estimado" valor={lead.interesse_volume_estimado} />
                                  <Campo rotulo="Urgência" valor={lead.interesse_urgencia} />
                                  {lead.contexto_resumo_conversa && (
                                    <div className="md:col-span-3 flex flex-col gap-1 pt-1" style={{ borderTop: `1px solid ${C.bordaClara}` }}>
                                      <span className="text-[11px] font-semibold" style={{ color: C.suave }}>Resumo</span>
                                      <span className="text-[13px] leading-relaxed">{lead.contexto_resumo_conversa}</span>
                                    </div>
                                  )}
                                  {lead.contexto_perguntas_cliente && (
                                    <div className="md:col-span-3 flex flex-col gap-1">
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
                                    {lead.data_resposta && (
                                      <span className="text-xs" style={{ color: C.suave }}>
                                        Resp: {new Date(lead.data_resposta).toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                  </div>
                                  {lead.telefone && (
                                    <a
                                      href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[13px] font-semibold rounded-md px-4 py-2 min-h-[40px] inline-flex items-center no-underline"
                                      style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}`, color: C.tinta }}
                                    >
                                      Abrir no WhatsApp
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
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
