'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabase } from '@/lib/supabase'
import { ShoppingBag, Loader2 } from 'lucide-react'

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

    console.log("[v0] Login bem-sucedido para:", data.user?.email)

    // Salvar dados do usuario no localStorage como fallback
    if (data?.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session))
      localStorage.setItem('user_email', data.user?.email || '')
    }

    // Verificar role do usuario e redirecionar
    const { data: userData, error: roleError } = await supabase
      .from('crm_users')
      .select('role')
      .eq('email', data.user?.email)
      .single()

    console.log("[v0] Dados do usuario:", userData, "Erro:", roleError)

    if (roleError) {
      setError(`Usuario nao encontrado no sistema. Por favor, contate o administrador.`)
      setLoading(false)
      return
    }

    console.log("[v0] Role do usuario:", userData?.role)

    if (userData?.role === 'vendedor') {
      console.log("[v0] Redirecionando para dashboard vendedor...")
      window.location.href = '/dashboard/vendedor'
    } else {
      console.log("[v0] Redirecionando para dashboard admin...")
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 leading-3 tracking-normal bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600">
            <ShoppingBag className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">CRM Atacado Mania</CardTitle>
          <CardDescription>
            Gestao de leads para atacado e varejo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
