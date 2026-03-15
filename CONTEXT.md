# Contexto do Projeto — Sistema de Dropshipping Autônomo

## O que é este projeto
Sistema de dropshipping 100% autônomo em Next.js 14 + Supabase.
Busca produtos automaticamente nos fornecedores (AliExpress, CJ Dropshipping),
publica na loja, processa pagamentos BR (Pix/Cartão/Boleto) e realiza
o fulfillment sem intervenção humana.

## Stack
- Frontend/Admin: Next.js 14 App Router + TypeScript strict
- Banco: Supabase (PostgreSQL + Auth + Storage + RLS)
- Workers: pg_cron + pg_net + Edge Functions
- Pagamentos: Mercado Pago (Pix, Cartão, Boleto)
- Logística: Correios API + Melhor Envio
- Notificações: Resend (email) + Twilio (WhatsApp)
- NF-e: Focus NFe / eNotas
- Rate Limiting/Cache: Upstash Redis
- Observabilidade: Sentry
- Deploy: Vercel (frontend) + Railway (workers)

## Módulos
- M1: Onboarding    → hooks/useOnboarding.ts + /api/admin/onboarding/complete
- M2: Sourcing      → workers/sourcing/index.ts (pg_cron, cada 6h)
- M3: Loja          → app/(store)/
- M4: Pagamentos    → lib/payment/ + /api/webhooks/payment (HMAC)
- M5: Fulfillment   → workers/fulfillment/
- M6: Database      → supabase/migrations/
- M7: Gateway       → middleware.ts + lib/gateway-router.ts

## Regras de negócio críticas
- Preço = custo_BRL * (1 + markup_frete%) / (1 - margem%)
- Pagamento só dispara fulfillment após verificação HMAC do webhook
- Idempotência: chave única por evento de pagamento no Redis (TTL 24h)
- RLS: cada admin vê APENAS seus próprios dados (isolamento por admin_id)
- Workers: fire-and-forget, erros logados mas não quebram o fluxo HTTP

## Fornecedores ativos
- AliExpress Affiliate API (HMAC-MD5, endpoint: api-sg.aliexpress.com)
- CJ Dropshipping API v2.0 (JWT Bearer, endpoint: developers.cjdropshipping.com)

## Fluxo de pagamento completo
1. Cliente finaliza checkout → POST /api/checkout/session (cria sessão Redis)
2. Frontend cria pagamento via SDK MP (tokeniza cartão client-side)
3. POST /api/checkout/confirm → cria pedido no banco + chama MP API
4. MP dispara webhook → POST /api/webhooks/payment (verifica HMAC)
5. Webhook aprova → atualiza pedido → dispara worker de fulfillment
6. Worker compra no fornecedor → captura rastreio → notifica cliente

## Tabelas do banco
- `administrador` — 1:1 com auth.users
- `configuracoes_gerais` — 1:1 com administrador (margem, suppliers, gateway)
- `produtos` — N:1 com administrador (sourcing automático)
- `clientes` — 1:1 com auth.users do comprador
- `pedidos` — N:1 com clientes + administrador (itens JSONB)
- `logs` — registro de todas as ações dos workers

## Convenções de código
- NUNCA usar SELECT * — listar campos necessários
- Validação Zod em TODOS os endpoints POST/PUT
- CPF nunca em plain text — usar SHA-256 hash (LGPD)
- SERVICE_ROLE_KEY apenas server-side (route.ts, workers)
- Componentes em components/store/ (pública) ou components/admin/ (painel)
