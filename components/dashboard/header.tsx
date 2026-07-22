"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut, ShoppingBag } from "lucide-react"
import { getSupabase } from "@/lib/supabase" // Declaring the getSupabase variable

interface HeaderProps {
  sellerName: string
}

export function Header({ sellerName }: HeaderProps) {
  const router = useRouter()
  const supabase = getSupabase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">CRM Calcados</h1>
            <p className="text-sm text-slate-500">Gestao de Leads</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{sellerName}</p>
            <p className="text-xs text-slate-500">Vendedor</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}
