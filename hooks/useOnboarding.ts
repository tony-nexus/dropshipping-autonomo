'use client'

import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// ── Tipos ────────────────────────────────────────────────
export type OnboardingStep =
  | 'store_info' | 'sourcing_preferences' | 'gateways_shipping' | 'completed'

export interface OnboardingState {
  // Etapa 1 — Dados da loja
  nomeLoja: string
  logoUrl: string | null
  corPrimaria: string
  // Etapa 2 — Sourcing & Margem
  categoriasInteresse: string[]
  palavrasChave: string[]
  precoCustoMin: number
  precoCustoMax: number
  margemLucroPct: number
  maxProdutosDia: number
  autoPublish: boolean
  // Etapa 3 — Gateways & Envio
  gatewayPagamento: 'mercadopago' | 'pagarme'
  gatewayAccessToken: string
  gatewayPublicKey: string
  transportadoras: string[]
  freteGratisAcima: number | null
  nfeProvider: 'focusnfe' | 'enotas'
  nfeToken: string
  cnpjEmitente: string
}

const INITIAL_STATE: OnboardingState = {
  nomeLoja:            '',
  logoUrl:             null,
  corPrimaria:         '#5B21B6',
  categoriasInteresse: [],
  palavrasChave:       [],
  precoCustoMin:       5,
  precoCustoMax:       100,
  margemLucroPct:      40,
  maxProdutosDia:      50,
  autoPublish:         true,
  gatewayPagamento:    'mercadopago',
  gatewayAccessToken:  '',
  gatewayPublicKey:    '',
  transportadoras:     ['correios'],
  freteGratisAcima:    null,
  nfeProvider:         'focusnfe',
  nfeToken:            '',
  cnpjEmitente:        '',
}

const STEPS: OnboardingStep[] = [
  'store_info', 'sourcing_preferences', 'gateways_shipping', 'completed'
]

/**
 * Mapeia estado do wizard para colunas do banco de dados.
 * Apenas campos públicos — credenciais vão via API route segura.
 */
function mapStateToDb(state: OnboardingState) {
  return {
    nome_loja:             state.nomeLoja,
    logo_url:              state.logoUrl,
    cor_primaria:          state.corPrimaria,
    categorias_interesse:  state.categoriasInteresse,
    palavras_chave:        state.palavrasChave,
    preco_custo_min:       state.precoCustoMin,
    preco_custo_max:       state.precoCustoMax,
    margem_lucro_pct:      state.margemLucroPct,
    max_produtos_dia:      state.maxProdutosDia,
    auto_publish:          state.autoPublish,
    gateway_pagamento:     state.gatewayPagamento,
    transportadoras:       state.transportadoras,
  }
}

/**
 * Hook principal do wizard de onboarding (3 etapas).
 *
 * Cada etapa persiste incrementalmente via upsert no Supabase —
 * o progresso nunca se perde se o usuário fechar o browser.
 * Ao completar a etapa 3, dispara o primeiro job de sourcing.
 */
export function useOnboarding() {
  const supabase = createClientComponentClient()
  const router   = useRouter()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('store_info')
  const [state, setState]             = useState<OnboardingState>(INITIAL_STATE)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const advanceStep = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: admin } = await supabase
        .from('administrador')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!admin) throw new Error('Admin não encontrado')

      // Persiste progresso atual antes de avançar
      await supabase.from('configuracoes_gerais').upsert({
        admin_id:   admin.id,
        ...mapStateToDb(state),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'admin_id' })

      const idx = STEPS.indexOf(currentStep)
      setCurrentStep(STEPS[idx + 1])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [currentStep, state, supabase])

  const completeOnboarding = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const { data: admin } = await supabase
        .from('administrador')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!admin) throw new Error('Admin não encontrado')

      // Credenciais via API route segura — usa SERVICE_ROLE_KEY server-side
      const res = await fetch('/api/admin/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adminId: admin.id, config: state }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao completar onboarding')
      }

      await supabase.from('administrador')
        .update({ onboarding_ok: true })
        .eq('id', admin.id)

      setCurrentStep('completed')
      router.push('/admin/dashboard')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [state, supabase, router])

  return {
    currentStep,
    stepIndex:         STEPS.indexOf(currentStep),
    totalSteps:        3,
    state,
    loading,
    error,
    updateState:       (partial: Partial<OnboardingState>) => setState(s => ({ ...s, ...partial })),
    advanceStep,
    completeOnboarding,
  }
}
