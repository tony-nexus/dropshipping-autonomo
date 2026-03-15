import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'

function buildSignature(secret: string, ts: string, dataId: string, requestId: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
  return `ts=${ts},v1=${v1}`
}

describe('Webhook HMAC Verification Logic', () => {
  it('gera uma assinatura que o webhooks/payment/route.ts consideraria válida (manualmente replicado)', () => {
    const secret = 'test-secret'
    const ts = '1700000000'
    const dataId = 'pay123'
    const reqId = 'req456'
    
    const sig = buildSignature(secret, ts, dataId, reqId)
    
    expect(sig).toContain('v1=')
    expect(sig).toContain('ts=1700000000')
    
    // Parse signature
    const parts = sig.split(',').reduce((acc, part) => {
      const [key, val] = part.trim().split('=')
      acc[key] = val
      return acc
    }, {} as Record<string, string>)

    const manifest = `id:${dataId};request-id:${reqId};ts:${parts.ts};`
    const recalculated = createHmac('sha256', secret).update(manifest).digest('hex')

    expect(parts.v1).toEqual(recalculated)
  })
})
