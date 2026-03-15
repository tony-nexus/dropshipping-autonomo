// ============================================================
// workers/sourcing/index.ts
// Orquestrador principal do Motor de Automação (M2)
// Executado a cada 6h via pg_cron
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { calcularPreco, buscarTaxaCambio } from '../../lib/pricing'
import { AliExpressAdapter } from './suppliers/aliexpress'
import { CJDropshippingAdapter } from './suppliers/cj-dropshipping'
import type { ISupplierAdapter, RawSupplierProduct } from './suppliers/base'

// Cliente Supabase com service_role — server-side ONLY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface SourcingWorkerOptions {
  adminId: string
  trigger: 'cron' | 'onboarding_complete' | 'manual'
}

interface AdminConfig {
  id: string
  palavras_chave: string[]
  categorias_interesse: string[]
  preco_custo_min: number
  preco_custo_max: number
  margem_lucro_pct: number
  markup_frete: number
  moeda_fornecedor: string
  max_produtos_dia: number
  auto_publish: boolean
  aliexpress_app_key: string | null
  aliexpress_app_secret: string | null
  cj_api_key: string | null
  cj_email: string | null
}

/**
 * Carrega configurações do admin a partir do Supabase.
 */
async function loadAdminConfig(adminId: string): Promise<AdminConfig> {
  const { data, error } = await supabase
    .from('configuracoes_gerais')
    .select(
      'id, palavras_chave, categorias_interesse, preco_custo_min, preco_custo_max, ' +
      'margem_lucro_pct, markup_frete, moeda_fornecedor, max_produtos_dia, ' +
      'auto_publish, aliexpress_app_key, aliexpress_app_secret, cj_api_key'
    )
    .eq('admin_id', adminId)
    .single()

  if (error || !data) throw new Error(`Config não encontrada para admin ${adminId}`)
  return data as AdminConfig
}

/**
 * Instancia os adapters disponíveis baseado nas credenciais do admin.
 */
function buildAdapters(config: AdminConfig): ISupplierAdapter[] {
  const adapters: ISupplierAdapter[] = []

  if (config.aliexpress_app_key && config.aliexpress_app_secret) {
    adapters.push(new AliExpressAdapter(config.aliexpress_app_key, config.aliexpress_app_secret))
  }

  if (config.cj_api_key && config.cj_email) {
    adapters.push(new CJDropshippingAdapter(config.cj_api_key, config.cj_email))
  }

  return adapters
}

/**
 * Verifica se produto já existe no catálogo do admin (evita duplicatas).
 */
async function produtoJaExiste(
  adminId: string,
  fornecedorNome: string,
  externalId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('produtos')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', adminId)
    .eq('fornecedor_nome', fornecedorNome)
    .eq('fornecedor_item_id', externalId)

  return (count ?? 0) > 0
}

/**
 * Verifica se o preço em BRL está dentro do filtro configurado.
 */
function dentroDoFiltroDePreco(precoBRL: number, config: AdminConfig): boolean {
  const taxaImplicita = config.moeda_fornecedor === 'BRL' ? 1 : 1
  const min = config.preco_custo_min * taxaImplicita
  const max = config.preco_custo_max * taxaImplicita
  return precoBRL >= min && precoBRL <= max
}

/**
 * Gera slug SEO-friendly a partir do título.
 */
function gerarSlug(titulo: string, id: string): string {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return `${base}-${id.slice(0, 8)}`
}

/**
 * Processa conteúdo do produto: título, descrição e SEO.
 * Em produção: integrar com DeepL para tradução automática.
 */
async function processarConteudo(produto: RawSupplierProduct, adminId: string) {
  const titulo = produto.title.slice(0, 200)
  const tempId = `${adminId.slice(0, 8)}-${Date.now()}`

  return {
    titulo,
    descricao:     produto.description,
    descricao_html: `<p>${produto.description}</p>`,
    categorias:    produto.category ? [produto.category] : [],
    tags:          titulo.toLowerCase().split(' ').slice(0, 10),
    meta_titulo:   titulo.slice(0, 60),
    meta_descricao: produto.description.slice(0, 160),
    slug:          gerarSlug(titulo, tempId),
    peso_gramas:   produto.weight ? Math.round(produto.weight * 1000) : null,
  }
}

/**
 * Registra log de worker na tabela logs.
 */
async function logWorker(nivel: 'info' | 'warning' | 'error', mensagem: string, payload?: object) {
  await supabase.from('logs').insert({
    nivel,
    servico: 'sourcing-worker',
    acao:    'run',
    mensagem,
    payload: payload ?? null,
  }).then(() => {})  // fire-and-forget — nunca bloqueia
}

/**
 * Orquestrador principal do Worker de Sourcing.
 * Para cada adapter × keyword: busca, filtra, precifica e insere produtos.
 */
export async function runSourcingWorker(options: SourcingWorkerOptions) {
  await logWorker('info', `Worker iniciado — trigger: ${options.trigger}`)

  const config     = await loadAdminConfig(options.adminId)
  const adapters   = buildAdapters(config)
  const taxaCambio = await buscarTaxaCambio()
  let publicados   = 0

  if (adapters.length === 0) {
    await logWorker('warning', 'Nenhum adapter configurado — verificar credenciais de fornecedor')
    return { publicados: 0 }
  }

  for (const adapter of adapters) {
    for (const keyword of config.palavras_chave) {
      if (publicados >= config.max_produtos_dia) {
        await logWorker('info', `Limite diário atingido (${config.max_produtos_dia} produtos)`)
        return { publicados }
      }

      let produtos: RawSupplierProduct[]
      try {
        produtos = await adapter.search({
          keywords:  [keyword],
          priceMin:  config.preco_custo_min / taxaCambio,
          priceMax:  config.preco_custo_max / taxaCambio,
          page:      1,
          pageSize:  20,
        })
      } catch (err) {
        await logWorker('error', `Erro ao buscar no ${adapter.name}: ${(err as Error).message}`)
        continue
      }

      for (const produto of produtos) {
        if (publicados >= config.max_produtos_dia) break

        // Verifica duplicata
        if (await produtoJaExiste(options.adminId, adapter.name, produto.externalId)) continue

        // Verifica faixa de preço em BRL
        const precoBRL = produto.price * taxaCambio
        if (!dentroDoFiltroDePreco(precoBRL, config)) continue

        // Verifica estoque mínimo
        if (produto.stock < 5) continue

        try {
          const conteudo     = await processarConteudo(produto, options.adminId)
          const precificacao = calcularPreco(produto.price, {
            margemLucroPct:   config.margem_lucro_pct,
            markupFrete:      config.markup_frete,
            moedaFornecedor: config.moeda_fornecedor,
          }, taxaCambio)

          const { error } = await supabase.from('produtos').insert({
            admin_id:           options.adminId,
            fornecedor_nome:    adapter.name,
            fornecedor_item_id: produto.externalId,
            fornecedor_url:     produto.supplierUrl,
            preco_custo:        precificacao.precoCusto,
            preco_custo_moeda:  'BRL',
            imagens:            produto.images.slice(0, 10),
            variantes:          produto.variants.length > 0 ? produto.variants : null,
            estoque:            produto.stock,
            preco_venda:        precificacao.precoFinal,
            preco_comparacao:   precificacao.precoComparacao,
            status:             config.auto_publish ? 'active' : 'draft',
            ...conteudo,
          })

          if (error) {
            await logWorker('warning', `Erro ao inserir produto ${produto.externalId}: ${error.message}`)
          } else {
            publicados++
          }
        } catch (err) {
          await logWorker('error', `Erro ao processar produto ${produto.externalId}: ${(err as Error).message}`)
        }
      }
    }
  }

  await logWorker('info', `Worker concluído — ${publicados} produtos publicados`)
  return { publicados }
}
