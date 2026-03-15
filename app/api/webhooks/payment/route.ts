import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

// Clientes server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const redis = Redis.fromEnv()

// ── Verificação de assinatura HMAC (Mercado Pago v2) ─────
/**
 * Verifica a assinatura HMAC-SHA256 do Mercado Pago.
 * Formato do header x-signature: "ts=123456,v1=<hash>"
 * Manifest: "id:<dataId>;request-id:<xRequestId>;ts:<ts>;"
 */
function verifySignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  try {
    const parts = xSignature.split(',').reduce((acc, part) => {
      const [key, val] = part.trim().split('=')
      acc[key] = val
      return acc
    }, {} as Record<string, string>)

    if (!parts.ts || !parts.v1) return false

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`
    const hmac = createHmac('sha256', secret).update(manifest).digest('hex')

    // timingSafeEqual previne timing attacks
    return timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(parts.v1)
    )
  } catch {
    return false
  }
}

/**
 * Busca detalhes do pagamento diretamente na API do Mercado Pago.
 * Valida status server-side — nunca confiar no payload do webhook.
 */
async function buscarPagamentoMP(paymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    },
  })
  if (!res.ok) throw new Error(`MP API error: ${res.status}`)
  return res.json()
}

/**
 * POST /api/webhooks/payment
 *
 * Recebe eventos de pagamento do Mercado Pago e processa:
 * 1. Verifica assinatura HMAC (rejeita se inválida)
 * 2. Filtra apenas eventos de pagamento aprovado
 * 3. Verifica idempotência via Redis (TTL 24h)
 * 4. Busca detalhes na API do MP (valida status server-side)
 * 5. Atualiza pedido no banco
 * 6. Dispara fulfillment autônomo (fire-and-forget)
 */
export async function POST(req: NextRequest) {
  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dataId = (body.data as Record<string, unknown>)?.id?.toString() ?? ''

  // 1. Verifica assinatura HMAC — rejeita imediatamente se inválida
  const isValid = verifySignature(
    xSignature,
    xRequestId,
    dataId,
    process.env.MERCADOPAGO_WEBHOOK_SECRET!
  )
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Filtra apenas eventos de pagamento atualizado
  if (body.type !== 'payment' || body.action !== 'payment.updated') {
    return NextResponse.json({ received: true })
  }

  if (!dataId) {
    return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
  }

  // 3. Verifica idempotência — previne double fulfillment
  const jaProcessado = await redis.get(`webhook:mp:${dataId}`)
  if (jaProcessado) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // 4. Busca detalhes na API do MP e verifica status real
  let paymentDetails: Record<string, unknown>
  try {
    paymentDetails = await buscarPagamentoMP(dataId)
  } catch (err) {
    return NextResponse.json(
      { error: 'Erro ao consultar API do MP', details: (err as Error).message },
      { status: 502 }
    )
  }

  if (paymentDetails.status !== 'approved') {
    return NextResponse.json({ received: true, status: paymentDetails.status })
  }

  // 5. Atualiza pedido no banco
  const { data: pedido, error: updateError } = await supabase
    .from('pedidos')
    .update({
      status_pagamento: 'approved',
      status:           'payment_approved',
      gateway_tx_id:    dataId,
      gateway_response: paymentDetails,
      pago_em:          new Date().toISOString(),
    })
    .eq('gateway_tx_id', paymentDetails.external_reference as string)
    .select('id, admin_id')
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: 'Erro ao atualizar pedido', details: updateError.message },
      { status: 500 }
    )
  }

  // 6. Marca como processado no Redis (TTL 24h = 86400s)
  await redis.setex(`webhook:mp:${dataId}`, 86400, '1')

  // 7. Dispara fulfillment autônomo — fire-and-forget
  if (pedido) {
    fetch(`${process.env.INTERNAL_WORKER_URL}/api/fulfillment/process`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKER_SECRET_KEY}`,
      },
      body: JSON.stringify({ pedidoId: pedido.id, adminId: pedido.admin_id }),
    }).catch(() => {})
  }

  return NextResponse.json({ received: true, pedidoId: pedido?.id })
}
