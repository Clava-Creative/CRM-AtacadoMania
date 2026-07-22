'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, CheckCircle2, DollarSign, MessageCircle } from 'lucide-react'

export default function VendedorDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<any[]>([])
  const [tracking, setTracking] = useState<Record<string, any>>({})
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [leadsFiltrados, setLeadsFiltrados] = useState<any[]>([])
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
        cliente: item.nome_cliente,
        telefone: item.telefone_cliente,
        cidade: item.cidade_pais,
        interesse: item.interesse,
        data: item.data_encaminhamento
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
      setLeadsFiltrados(prev => prev.map(l => 
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

  // Filtrar leads por período
  const leadsPorPeriodo = mostrarTodos ? leads : leads.filter(lead => {
    if (!dataInicio && !dataFim) {
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

  // Filtrar leads por busca
  const leadsExibidos = leadsPorPeriodo.filter(lead => {
    if (!busca) return true
    
    const termoBusca = busca.toLowerCase()
    return (
      lead.cliente?.toLowerCase().includes(termoBusca) ||
      lead.telefone?.toLowerCase().includes(termoBusca) ||
      lead.cidade?.toLowerCase().includes(termoBusca) ||
      lead.interesse?.toLowerCase().includes(termoBusca)
    )
  })

  const totalRespondidos = leadsExibidos.filter(l => l.respondido).length
  const totalConvertidos = leadsExibidos.filter(l => l.convertido).length
  const taxaConversao = leadsExibidos.length > 0 
    ? ((totalConvertidos / leadsExibidos.length) * 100).toFixed(1) 
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
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meus Leads</h1>
            <p className="text-sm text-slate-600">{user?.vendedor_nome}</p>
          </div>
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
              <div className="text-3xl font-bold text-slate-900">{leadsExibidos.length}</div>
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
                {leadsExibidos.length > 0 ? ((totalRespondidos / leadsExibidos.length) * 100).toFixed(1) : 0}% do período
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
              <CardTitle className="text-sm font-medium text-slate-600">Atacado / Varejo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p className="text-blue-600 font-semibold">
                  {leadsExibidos.filter(l => l.tipo === 'Atacado').length} Atacado
                </p>
                <p className="text-green-600 font-semibold">
                  {leadsExibidos.filter(l => l.tipo === 'Varejo').length} Varejo
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Leads</CardTitle>
              <div className="flex-1 max-w-md ml-4">
                <input
                  type="text"
                  placeholder="Buscar por cliente, telefone, cidade ou interesse..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leadsExibidos.length === 0 ? (
              <p className="text-slate-600 text-center py-8">Nenhum lead encontrado no período selecionado</p>
            ) : (
              <div className="space-y-3">
                {leadsExibidos.map((lead) => {
                  const leadTracking = tracking[lead.id] || {};
                  return (
                    <div key={lead.id} className={`p-4 border rounded-lg transition-colors ${
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
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
