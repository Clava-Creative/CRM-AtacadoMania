'use client'

import React from "react"

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

const C = {
  fundo: '#F6F4F0',
  superficie: '#FFFFFF',
  borda: '#E3DFD8',
  bordaBotao: '#CFC9C0',
  tinta: '#1C1B18',
  texto: '#4A463F',
  suave: '#6B6760',
  erro: '#A03328',
  erroFundo: '#FBF1EF',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = getSupabase()
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    // Salvar dados do usuário no localStorage como fallback
    if (data?.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session))
      localStorage.setItem('user_email', data.user?.email || '')
    }

    // Verificar role do usuário e redirecionar
    const { data: userData, error: roleError } = await supabase
      .from('crm_users')
      .select('role')
      .eq('email', data.user?.email)
      .single()

    if (roleError) {
      setError('Usuário não encontrado no sistema. Fale com o administrador.')
      setLoading(false)
      return
    }

    if (userData?.role === 'vendedor') {
      window.location.href = '/dashboard/vendedor'
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.fundo, color: C.tinta }}>
      <div className="w-full max-w-[400px] flex flex-col gap-6">

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Atacado Mania</h1>
          <p className="text-sm" style={{ color: C.suave }}>Distribuição de leads</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 p-6 rounded-[10px]"
          style={{ background: C.superficie, border: `1px solid ${C.borda}` }}
        >
          {error && (
            <div
              className="p-3 text-[13px] rounded-md"
              style={{ background: C.erroFundo, border: `1px solid #E8CFCB`, color: C.erro }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold" style={{ color: C.suave }}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-sm rounded-md px-3 py-3 min-h-[44px] focus:outline-none"
              style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}`, color: C.tinta }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="senha" className="text-xs font-semibold" style={{ color: C.suave }}>Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-sm rounded-md px-3 py-3 min-h-[44px] focus:outline-none"
              style={{ background: C.superficie, border: `1px solid ${C.bordaBotao}`, color: C.tinta }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-semibold rounded-md px-4 py-3 min-h-[44px] inline-flex items-center justify-center gap-2"
            style={{
              background: loading ? C.texto : C.tinta,
              color: '#FFFFFF',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

      </div>
    </div>
  )
}
