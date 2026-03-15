// ============================================================
// workers/sourcing/suppliers/aliexpress.ts
// Adaptador AliExpress Affiliate API
// Autenticação: HMAC-MD5 obrigatória em todos os requests
// Endpoint: https://api-sg.aliexpress.com/sync
// ============================================================

import { createHash } from 'crypto'
import type { ISupplierAdapter, RawSupplierProduct, RawVariant, SearchParams } from './base'

interface AliProduct {
  product_id: string
  product_title: string
  product_detail_url: string
  product_main_image_url: string
  product_small_image_urls?: { string: string[] }
  sale_price: string
  discount: string | null
  lastest_volume: string | null
  product_rating_info?: { average_star: string }
  evaluate_rate?: string
  shop_url?: string
  target_original_price?: string
  target_sale_price?: string
  first_level_category_name?: string
  second_level_category_name?: string
}

interface AliResponse {
  aliexpress_affiliate_product_query_response?: {
    resp_result?: {
      result?: {
        products?: {
          product?: AliProduct[]
        }
      }
    }
  }
}

function mapAliProduct(p: AliProduct): RawSupplierProduct {
  const images: string[] = [p.product_main_image_url]
  if (p.product_small_image_urls?.string) {
    images.push(...p.product_small_image_urls.string)
  }

  const price = parseFloat(p.sale_price || p.target_sale_price || '0')
  const category = p.second_level_category_name || p.first_level_category_name || ''

  return {
    externalId:   p.product_id,
    title:        p.product_title,
    description:  p.product_title, // AliExpress básico não retorna descrição longa no search
    images:       [...new Set(images)].filter(Boolean),
    price,
    currency:     'USD',
    stock:        parseInt(p.lastest_volume ?? '0') || 999, // volume vendido, não estoque exato
    weight:       null,
    shippingTime: null,
    category,
    supplierName: 'AliExpress',
    supplierUrl:  p.product_detail_url,
    variants:     [] as RawVariant[],
    rating:       p.product_rating_info
                    ? parseFloat(p.product_rating_info.average_star)
                    : null,
    reviewCount:  null,
  }
}

export class AliExpressAdapter implements ISupplierAdapter {
  name = 'aliexpress'

  constructor(
    private appKey: string,
    private appSecret: string
  ) {}

  /**
   * Gera assinatura HMAC-MD5 obrigatória da API AliExpress.
   * Formato: MD5(appSecret + sortedParams + appSecret).toUpperCase()
   */
  private sign(params: Record<string, string>): string {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}${params[k]}`)
      .join('')
    return createHash('md5')
      .update(this.appSecret + sorted + this.appSecret)
      .digest('hex')
      .toUpperCase()
  }

  /**
   * Faz uma chamada autenticada à API AliExpress.
   */
  private async call(method: string, extraParams: Record<string, string>): Promise<AliResponse> {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const params: Record<string, string> = {
      app_key:    this.appKey,
      method,
      session:    '',
      timestamp,
      sign_method: 'md5',
      v:           '2.0',
      ...extraParams,
    }
    params.sign = this.sign(params)

    const url = new URL('https://api-sg.aliexpress.com/sync')
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`AliExpress API error: ${res.status}`)
    return res.json()
  }

  async search(params: SearchParams): Promise<RawSupplierProduct[]> {
    const data = await this.call('aliexpress.affiliate.product.query', {
      keywords:        params.keywords.join(' '),
      min_sale_price:  (params.priceMin * 100).toString(),
      max_sale_price:  (params.priceMax * 100).toString(),
      page_no:         params.page.toString(),
      page_size:       params.pageSize.toString(),
      ship_to_country: 'BR',
      target_currency: 'USD',
      tracking_id:     'dropshipping_auto',
      ...(params.category ? { category_ids: params.category } : {}),
    })

    const products =
      data?.aliexpress_affiliate_product_query_response
        ?.resp_result?.result?.products?.product ?? []

    return products.map(mapAliProduct)
  }

  async getProduct(externalId: string): Promise<RawSupplierProduct | null> {
    try {
      const data = await this.call('aliexpress.affiliate.productdetail.get', {
        product_ids:     externalId,
        ship_to_country: 'BR',
        target_currency: 'USD',
        tracking_id:     'dropshipping_auto',
      })

      const products =
        data?.aliexpress_affiliate_product_query_response
          ?.resp_result?.result?.products?.product ?? []

      return products[0] ? mapAliProduct(products[0]) : null
    } catch {
      return null
    }
  }

  async getStock(externalIds: string[]): Promise<Record<string, number>> {
    // AliExpress affiliate não expõe estoque exato — retorna estimativa
    return Object.fromEntries(externalIds.map(id => [id, 999]))
  }
}
