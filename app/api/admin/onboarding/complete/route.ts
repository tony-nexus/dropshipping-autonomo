import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { cookies } from 'next/headers'

// Cliente privilegiado — server-side ONLY, nunca expor no frontend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Esquema de validação Zod
const Schema = z.object({
  adminId: z.string().uuid(),
  config: z.object({
    nomeLoja:           z.string().min(2).max(100),
    margemLucroPct:     z.number().min(5).max(500),
    gatewayPagamento:   z.enum(['mercadopago', 'pagarme']),
    gatewayAccessToken: z.string().min(10),
    gatewayPublicKey:   z.string().min(5).default(''),
    cnpjEmitente:       z.string().regex(/^\d{14}$/).optional(),
    nfeProvider:        z.enum(['focusnfe', 'enotas']).optional(),
    nfeToken:           z.string().optional(),
    transportadoras:    z.array(z.string()).default([]),
    freteGratisAcima:   z.number().nullable().optional(),
    autoPublish:        z.boolean().default(true),
    maxProdutosDia:     z.number().min(1).max(500).default(50),
  }),
})

/**
 * Mapeia config do onboarding para colunas do banco de dados.
 */
function mapConfigToDb(config: z.infer<typeof Schema>['config']) {
  return {
    gateway_pagamento:   config.gatewayPagamento,
    gateway_access_token: config.gatewayAccessToken,
    gateway_public_key:  config.gatewayPublicKey,
    margem_lucro_pct:    config.margemLucroPct,
    transportadoras:     config.transportadoras,
    auto_publish:        config.autoPublish,
    max_produtos_dia:    config.maxProdutosDia,
    ...(config.nfeProvider   ? { nfe_provider:   config.nfeProvider   } : {}),
    ...(config.nfeToken      ? { nfe_token:       config.nfeToken      } : {}),
    ...(config.cnpjEmitente  ? { cnpj_emitente:   config.cnpjEmitente  } : {}),
    updated_at: new Date().toISOString(),
  }
}

/**
 * POST /api/admin/onboarding/complete
 *
 * Finaliza o wizard de onboarding:
 * 1. Valida sessão e ownership do adminId
 * 2. Persiste configurações via service_role (inclui credenciais sensíveis)
 * 3. Dispara o primeiro job de sourcing (fire-and-forget)
 */
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  // 1. Verifica sessão JWT
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2. Valida payload com Zod
  const parsed = Schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // 3. Garante que adminId pertence ao usuário autenticado (evita IDOR)
  const { data: admin } = await supabaseAdmin
    .from('administrador')
    .select('id')
    .eq('id', parsed.data.adminId)
    .eq('user_id', session.user.id)
    .single()

  if (!admin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // 4. Persiste configurações com service_role (inclui gateway_access_token)
  const { error: upsertError } = await supabaseAdmin
    .from('configuracoes_gerais')
    .upsert({
      admin_id: parsed.data.adminId,
      ...mapConfigToDb(parsed.data.config),
    }, { onConflict: 'admin_id' })

  if (upsertError) {
    return NextResponse.json(
      { error: 'Erro ao salvar configurações', details: upsertError.message },
      { status: 500 }
    )
  }

  // 5. Dispara primeiro job de sourcing — fire-and-forget, não bloqueia a resposta
  fetch(`${process.env.INTERNAL_WORKER_URL}/api/admin/sourcing/trigger`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WORKER_SECRET_KEY}`,
    },
    body: JSON.stringify({
      adminId: parsed.data.adminId,
      trigger: 'onboarding_complete',
    }),
  }).catch(() => {}) // silently ignore — worker pode ser iniciado manualmente depois

  return NextResponse.json({ success: true })
}
