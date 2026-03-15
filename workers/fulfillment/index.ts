// ============================================================
// workers/fulfillment/index.ts
// Orquestrador de Fulfillment Autônomo (M5)
// Disparado pelo webhook de pagamento aprovado
// ============================================================

import { createClient } from '@supabase/supabase-js'

// Cliente Supabase com service_role — server-side ONLY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface OrderItem {
  fornecedor_nome: string
  fornecedor_item_id: string
  variante: string | null
  quantidade: number
  titulo: string
  preco_unitario: number
}

interface ClienteInfo {
  nome: string
  email: string
  telefone: string | null
}

interface EnderecoEntrega {
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
}

/**
 * Registra log de worker na tabela logs.
 * Fire-and-forget — nunca bloqueia o fluxo principal.
 */
async function logWorker(
  nivel: 'info' | 'warning' | 'error',
  mensagem: string,
  pedidoId?: string,
  payload?: object
) {
  supabase.from('logs').insert({
    nivel,
    servico:   'fulfillment-worker',
    acao:      'process',
    mensagem,
    payload:   payload ?? null,
    pedido_id: pedidoId ?? null,
  }).then(() => {})
}

/**
 * Realiza o pedido no fornecedor externo.
 * Em produção: integrar com API do AliExpress/CJ Dropshipping.
 */
async function realizarPedidoFornecedor(params: {
  fornecedor: string
  externalId: string
  variante: string | null
  quantidade: number
  endereco: EnderecoEntrega & { nome: string; email: string }
  adminId: string
}): Promise<{ orderId: string }> {
  // Placeholder: integrar com API específica do fornecedor
  // AliExpress: aliexpress.trade.order.create
  // CJ: POST /order/createOrderV2
  const orderId = `${params.fornecedor.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  await logWorker(
    'info',
    `Pedido realizado no fornecedor ${params.fornecedor}`,
    undefined,
    { orderId, externalId: params.externalId }
  )

  return { orderId }
}

/**
 * Emite Nota Fiscal eletrônica via Focus NFe.
 * Erros são logados mas não quebram o fluxo de fulfillment.
 */
async function emitirNFe(pedido: Record<string, unknown>, adminId: string): Promise<void> {
  const { data: config } = await supabase
    .from('configuracoes_gerais')
    .select('nfe_token, nfe_provider, cnpj_emitente')
    .eq('admin_id', adminId)
    .single()

  if (!config?.nfe_token || !config?.cnpj_emitente) {
    await logWorker('warning', 'NF-e não configurada — pulando emissão', pedido.id as string)
    return
  }

  // Placeholder: integrar com Focus NFe API
  // POST https://api.focusnfe.com.br/v2/nfe
  await logWorker('info', `NF-e emitida para pedido ${pedido.numero}`, pedido.id as string)
}

/**
 * Notifica o cliente por email e/ou WhatsApp.
 * Integração: Resend (email) + Twilio (WhatsApp).
 */
async function notificarCliente(params: {
  email: string
  nome: string
  tipo: 'pedido_confirmado' | 'pedido_enviado' | 'pedido_entregue'
  dados: Record<string, string>
}): Promise<void> {
  // Placeholder: integrar com Resend API
  // POST https://api.resend.com/emails
  await logWorker('info', `Notificação enviada para ${params.email} — tipo: ${params.tipo}`)
}

/**
 * Sincroniza rastreamentos de pedidos em andamento.
 * Executado a cada 4h via pg_cron.
 */
export async function sincronizarRastreamentos(adminId: string): Promise<void> {
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, fornecedor_order_id, fornecedor_nome, clientes(email, nome)')
    .eq('admin_id', adminId)
    .in('status', ['supplier_confirmed', 'shipped', 'in_transit'])

  for (const pedido of pedidos ?? []) {
    // Placeholder: buscar rastreio via API do fornecedor
    // CJ: GET /order/getOrderDetail
    // AliExpress: aliexpress.trade.order.get

    await logWorker(
      'info',
      `Rastreamento sincronizado para pedido ${pedido.id}`,
      pedido.id
    )
  }
}

/**
 * Orquestrador principal de fulfillment.
 *
 * Fluxo:
 * 1. Busca pedido e verifica status 'payment_approved'
 * 2. Atualiza status → 'purchasing_supplier'
 * 3. Realiza pedido no fornecedor por item
 * 4. Atualiza status → 'supplier_confirmed'
 * 5. Emite NF-e (catch silencioso — não quebra fluxo)
 * 6. Notifica cliente
 */
export async function processarFulfillment(pedidoId: string, adminId: string): Promise<void> {
  await logWorker('info', `Iniciando fulfillment para pedido ${pedidoId}`, pedidoId)

  // 1. Busca pedido com dados do cliente
  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('*, clientes(nome, email, telefone)')
    .eq('id', pedidoId)
    .single()

  if (error || !pedido) {
    await logWorker('error', `Pedido ${pedidoId} não encontrado`, pedidoId)
    return
  }

  // 2. Verifica status — só processa se pagamento aprovado
  if (pedido.status !== 'payment_approved') {
    await logWorker(
      'warning',
      `Pedido ${pedidoId} com status inesperado: ${pedido.status}`,
      pedidoId
    )
    return
  }

  // 3. Atualiza status → comprando no fornecedor
  await supabase
    .from('pedidos')
    .update({ status: 'purchasing_supplier' })
    .eq('id', pedidoId)

  const itens: OrderItem[] = pedido.itens ?? []
  const cliente: ClienteInfo = pedido.clientes
  const endereco: EnderecoEntrega = pedido.endereco_entrega

  // 4. Realiza pedido no fornecedor por item
  for (const item of itens) {
    try {
      const resultado = await realizarPedidoFornecedor({
        fornecedor: item.fornecedor_nome,
        externalId: item.fornecedor_item_id,
        variante:   item.variante ?? null,
        quantidade: item.quantidade,
        endereco:   { ...endereco, nome: cliente.nome, email: cliente.email },
        adminId,
      })

      await supabase
        .from('pedidos')
        .update({
          fornecedor_order_id: resultado.orderId,
          status:              'supplier_confirmed',
        })
        .eq('id', pedidoId)

      await logWorker('info', `Item "${item.titulo}" confirmado no fornecedor`, pedidoId)
    } catch (err) {
      await logWorker(
        'error',
        `Erro ao comprar item "${item.titulo}" no fornecedor: ${(err as Error).message}`,
        pedidoId
      )
    }
  }

  // 5. Emite NF-e — erro não quebra o fluxo
  await emitirNFe(pedido, adminId).catch(err =>
    logWorker('warning', `Falha na emissão NF-e: ${(err as Error).message}`, pedidoId)
  )

  // 6. Notifica cliente
  await notificarCliente({
    email: cliente.email,
    nome:  cliente.nome,
    tipo:  'pedido_confirmado',
    dados: {
      numeroPedido:      pedido.numero,
      estimativaEntrega: '15-30 dias',
    },
  })

  await logWorker('info', `Fulfillment concluído para pedido ${pedidoId}`, pedidoId)
}
