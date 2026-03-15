import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── Rate limiters ────────────────────────────────────────
const ratelimitPublic = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'),   // 60 req/min anônimo
  prefix: 'rl:public',
})

const ratelimitAuth = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(300, '1 m'),  // 300 req/min autenticado
  prefix: 'rl:auth',
})

// ── Rotas protegidas ─────────────────────────────────────
const ADMIN_ROUTES = ['/api/admin', '/api/products/publish', '/api/sourcing']
const USER_ROUTES  = ['/api/orders', '/api/customer', '/api/checkout/confirm']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const ip  = req.ip ?? req.headers.get('x-forwarded-for') ?? 'anon'

  // ── Segurança HTTP ──────────────────────────────────────
  res.headers.set('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN ?? '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (req.method === 'OPTIONS') return res

  // ── Rate limiting ───────────────────────────────────────
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  const limiter = session ? ratelimitAuth : ratelimitPublic
  const id = session ? `user:${session.user.id}` : `ip:${ip}`
  const { success, limit, remaining, reset } = await limiter.limit(id)

  res.headers.set('X-RateLimit-Limit',     limit.toString())
  res.headers.set('X-RateLimit-Remaining', remaining.toString())

  if (!success) return NextResponse.json(
    { error: 'Too Many Requests', retryAfter: Math.ceil((reset - Date.now()) / 1000) },
    { status: 429, headers: res.headers }
  )

  // ── Autenticação de rotas protegidas ────────────────────
  const { pathname } = req.nextUrl
  const isAdmin = ADMIN_ROUTES.some(r => pathname.startsWith(r))
  const isUser  = USER_ROUTES.some(r => pathname.startsWith(r))

  if ((isAdmin || isUser) && !session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isAdmin && session?.user.user_metadata?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return res
}

export const config = { matcher: ['/api/:path*', '/admin/:path*'] }
