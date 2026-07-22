'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ChevronDown, ChevronRight, CheckCircle2, DollarSign, MessageCircle } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [tracking, setTracking] = useState<Record<string, any>>({})
  const [expandedVendedores, setExpandedVendedores] = useState<Set<string>>(new Set())
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mostrarTodos, setMostrarTodos] = useState(false)

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
    
    // Buscar todos os leads das duas tabelas
    const { data: atacado } = await supabase
      .from('distribuicao_vendedores')
      .select('*')
      .order('data_encaminhamento', { ascending: false })
    
    const { data: varejo } = await supabase
      .from('distribuicao_vendedores_varejo')
      .select('*')
      .order('data_encaminhamento', { ascending: false })
    
    // Combinar e formatar os leads
    const allLeads = [
      ...(atacado || []).map(item => ({
        ...item,
        id: `atacado-${item.id}`,
        lead_id: item.id,
        lead_type: 'atacado',
        tipo: 'Atacado',
        vendedor: item.vendedor_nome,
        vendedor_telefone: item.vendedor_telefone,
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento,
        status: item.status || 'Novo',
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
        vendedor: item.vendedor_nome,
        vendedor_telefone: item.vendedor_telefone,
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento,
        status: 'Novo',
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
    
    const updateData: any = {
      [field]: value
    }
    
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
      // Atualizar o lead localmente
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
      const newSet = new Set(prev)
      if (newSet.has(vendedor)) {
        newSet.delete(vendedor)
      } else {
        newSet.add(vendedor)
      }
      return newSet
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
    
    // Criar HTML para PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e40af; margin-bottom: 5px; }
          .periodo { color: #64748b; font-size: 14px; margin-bottom: 20px; }
          .metricas { display: flex; gap: 20px; margin: 20px 0; }
          .metrica { background: #f1f5f9; padding: 15px; border-radius: 8px; flex: 1; }
          .metrica-label { font-size: 12px; color: #64748b; }
          .metrica-valor { font-size: 24px; font-weight: bold; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1e40af; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .respondido-sim { color: #16a34a; font-weight: bold; }
          .respondido-nao { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Relatório de Leads - ${vendedor}</h1>
        <div class="periodo">Período: ${periodo}</div>
        
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
              <th>Tipo</th>
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
                <td>${lead.tipo}</td>
                <td>${new Date(lead.data).toLocaleDateString('pt-BR')}</td>
                <td class="${lead.respondido ? 'respondido-sim' : 'respondido-nao'}">${lead.respondido ? 'Sim' : 'Não'}</td>
                <td class="${lead.convertido ? 'respondido-sim' : 'respondido-nao'}">${lead.convertido ? 'Sim' : 'Não'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    
    // Abrir em nova janela para impressão/salvar como PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  function exportarRelatorio() {
    // Implement the exportarRelatorio function here
  }

  // Filtrar leads pelo período
  const leadsFiltrados = mostrarTodos ? leads : leads.filter(lead => {
    if (!dataInicio && !dataFim) {
      // Se não houver filtro, mostrar apenas mês atual
      const hoje = new Date()
      const mesAtual = hoje.getMonth()
      const anoAtual = hoje.getFullYear()
      const dataLead = new Date(lead.data)
      return dataLead.getMonth() === mesAtual && dataLead.getFullYear() === anoAtual
    }
    
    // Converter a data do lead para início do dia (00:00:00) no timezone local
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

  // Vendedores inativos (saíram da empresa)
  const vendedoresInativos = ['Sandra Elena', 'Armando', 'Magdalena', 'Maria', 'Natália', 'Ana Gabriela']

  // Filtrar leads excluindo vendedores inativos
  const leadsAtivos = leadsFiltrados.filter(lead => 
    !vendedoresInativos.some(nome => 
      lead.vendedor?.toLowerCase().trim() === nome.toLowerCase().trim()
    )
  )

  // Agrupar leads por vendedor (apenas ativos)
  const leadsPorVendedor = leadsAtivos.reduce((acc, lead) => {
    if (!acc[lead.vendedor]) {
      acc[lead.vendedor] = []
    }
    acc[lead.vendedor].push(lead)
    return acc
  }, {} as Record<string, any[]>)

  const vendedores = Object.keys(leadsPorVendedor).sort()
  
  // Calcular métricas (apenas com leads de vendedores ativos)
  const totalRespondidos = leadsAtivos.filter(l => l.respondido).length
  const totalConvertidos = leadsAtivos.filter(l => l.convertido).length
  const taxaConversao = leadsAtivos.length > 0 
    ? ((totalConvertidos / leadsAtivos.length) * 100).toFixed(1) 
    : '0'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">CRM Atacado Mania </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.email}</span>
            <Button onClick={handleLogout} variant="outline" className="bg-transparent">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtrar por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-slate-900"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 block mb-1">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-slate-900"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={() => { setDataInicio(''); setDataFim(''); setMostrarTodos(false); }}
                  variant="outline"
                  className="bg-transparent"
                >
                  Mês Atual
                </Button>
                <Button 
                  onClick={() => { setMostrarTodos(true); }}
                  variant="outline"
                  className="bg-transparent"
                >
                  Todos os Leads
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {mostrarTodos ? '* Mostrando todos os leads' : (!dataInicio && !dataFim ? '* Mostrando apenas leads do mês atual' : '* Período personalizado')}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Leads no Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{leadsAtivos.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Respondidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalRespondidos}</div>
              <p className="text-sm text-slate-500 mt-1">
                {leadsAtivos.length > 0 ? ((totalRespondidos / leadsAtivos.length) * 100).toFixed(1) : 0}% do período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Convertidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totalConvertidos}</div>
              <p className="text-sm text-slate-500 mt-1">Taxa: {taxaConversao}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{vendedores.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leads por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            {vendedores.length === 0 ? (
              <p className="text-slate-600 text-center py-8">Nenhum lead encontrado</p>
            ) : (
              <div className="space-y-3">
                {vendedores.map((vendedor) => {
                  const vendedorLeads = leadsPorVendedor[vendedor]
                  const isExpanded = expandedVendedores.has(vendedor)
                  const vendedorRespondidos = vendedorLeads.filter(l => l.respondido).length
                  const vendedorConvertidos = vendedorLeads.filter(l => l.convertido).length
                  
                  return (
                    <div key={vendedor} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleVendedor(vendedor)}
                        className="w-full p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-slate-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-600" />
                          )}
                          <div className="text-left">
                            <h3 className="font-semibold text-slate-900">{vendedor}</h3>
                            <p className="text-sm text-slate-600">
                              {vendedorLeads[0]?.vendedor_telefone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-6 w-full">
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-xs text-slate-500">Total</p>
                              <p className="text-lg font-bold text-slate-900">{vendedorLeads.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Respondidos</p>
                              <p className="text-lg font-bold text-green-600">{vendedorRespondidos}</p>
                              <p className="text-xs text-slate-400">
                                {vendedorLeads.length > 0 ? ((vendedorRespondidos / vendedorLeads.length) * 100).toFixed(0) : 0}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Convertidos</p>
                              <p className="text-lg font-bold text-blue-600">{vendedorConvertidos}</p>
                              <p className="text-xs text-slate-400">
                                {vendedorLeads.length > 0 ? ((vendedorConvertidos / vendedorLeads.length) * 100).toFixed(0) : 0}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Taxa Conv.</p>
                              <p className="text-lg font-bold text-purple-600">
                                {vendedorRespondidos > 0 ? ((vendedorConvertidos / vendedorRespondidos) * 100).toFixed(0) : 0}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                Atacado: {vendedorLeads.filter(l => l.tipo === 'Atacado').length}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                Varejo: {vendedorLeads.filter(l => l.tipo === 'Varejo').length}
                              </span>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                exportarRelatorioVendedor(vendedor)
                              }}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Exportar PDF
                            </Button>
                          </div>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-white divide-y">
                          {vendedorLeads.map((lead) => {
                            return (
                              <div key={lead.id} className={`p-4 transition-colors ${
                                lead.respondido 
                                  ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                  : 'bg-red-50 border-red-200 hover:bg-red-100'
                              }`}>
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-slate-900">{lead.cliente}</h4>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        lead.tipo === 'Atacado' 
                                          ? 'bg-blue-100 text-blue-800' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {lead.tipo}
                                      </span>
                                      {lead.convertido && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
                                          Convertido
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1 text-sm mb-3">
                                      {lead.telefone && (
                                        <div className="flex items-center gap-2">
                                          <p className="text-slate-600">📞 {lead.telefone}</p>
                                          <a
                                            href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500 hover:bg-green-600 text-white text-xs transition-colors"
                                            title="Abrir no WhatsApp"
                                          >
                                            <MessageCircle className="h-3 w-3" />
                                            WhatsApp
                                          </a>
                                        </div>
                                      )}
                                      {lead.cidade && (
                                        <p className="text-slate-600">📍 {lead.cidade}</p>
                                      )}
                                      {lead.interesse && (
                                        <p className="text-slate-600">💼 {lead.interesse}</p>
                                      )}
                                      {lead.lead_idioma && (
                                        <p className="text-slate-600">🗣️ Idioma: {lead.lead_idioma}</p>
                                      )}
                                      {lead.interesse_tipo_calcado && (
                                        <p className="text-slate-600">👟 Tipo de Calçado: {lead.interesse_tipo_calcado}</p>
                                      )}
                                      {lead.interesse_marcas_interesse && (
                                        <p className="text-slate-600">🏷️ Marcas Interesse: {lead.interesse_marcas_interesse}</p>
                                      )}
                                      {lead.interesse_ja_revende && (
                                        <p className="text-slate-600">📦 Já Revende: {lead.interesse_ja_revende}</p>
                                      )}
                                      {lead.interesse_volume_estimado && (
                                        <p className="text-slate-600">📊 Volume Estimado: {lead.interesse_volume_estimado}</p>
                                      )}
                                      {lead.interesse_urgencia && (
                                        <p className="text-slate-600">⚡ Urgência: {lead.interesse_urgencia}</p>
                                      )}
                                      {lead.contexto_resumo_conversa && (
                                        <p className="text-slate-600">💬 Resumo: {lead.contexto_resumo_conversa}</p>
                                      )}
                                      {lead.contexto_perguntas_cliente && (
                                        <p className="text-slate-600">❓ Perguntas: {lead.contexto_perguntas_cliente}</p>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 pt-2 border-t">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox 
                                          checked={lead.respondido || false}
                                          onCheckedChange={(checked) => 
                                            updateTracking(lead, 'respondido', checked as boolean)
                                          }
                                        />
                                        <span className="text-sm text-slate-700">Respondido</span>
                                      </label>
                                      
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox 
                                          checked={lead.convertido || false}
                                          onCheckedChange={(checked) => 
                                            updateTracking(lead, 'convertido', checked as boolean)
                                          }
                                        />
                                        <span className="text-sm text-slate-700">Convertido</span>
                                      </label>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className="text-sm text-slate-500">
                                      {new Date(lead.data).toLocaleDateString('pt-BR')}
                                    </p>
                                    {lead.data_resposta && (
                                      <p className="text-xs text-green-600 mt-1">
                                        Resp: {new Date(lead.data_resposta).toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                    {lead.data_conversao && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Conv: {new Date(lead.data_conversao).toLocaleDateString('pt-BR')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
