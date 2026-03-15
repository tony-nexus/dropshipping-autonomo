import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import crypto from 'crypto'

const redis = Redis.fromEnv()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, subtotal, customer } = body

    if (!items || items.length === 0 || !customer || !customer.email) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // 1. Gera ID de sessão única para o redis
    const sessionId = crypto.randomUUID()

    // 2. Salva a sessão no Redis temporariamente (TTL 1 hora)
    const sessionData = {
      items,
      subtotal,
      customer,
      createdAt: new Date().toISOString()
    }
    
    // 3600 segundos (1 hora)
    await redis.setex(`checkout_session:${sessionId}`, 3600, sessionData)

    // Aqui retornaríamos a Preference ID do Mercado Pago, usando SDK.
    // Opcionalmente, pode-se comunicar com a API Server side do MP.

    return NextResponse.json({ sessionId, success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar checkout' }, { status: 500 })
  }
}
