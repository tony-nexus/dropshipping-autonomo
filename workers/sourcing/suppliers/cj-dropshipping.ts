// ============================================================
// workers/sourcing/suppliers/cj-dropshipping.ts
// Adaptador CJ Dropshipping API v2.0
// Autenticação: JWT Bearer (email + apiKey → token)
// Endpoint: https://developers.cjdropshipping.com/api2.0/v1
// ============================================================

import type { ISupplierAdapter, RawSupplierProduct, RawVariant, SearchParams } from './base'

const CJ_BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1'

interface CJProduct {
  pid: string
  productNameEn: string
  productImage: string
  productWeight: string | null
  sellPrice: string
  categoryName: string
  productKeyEn?: string
  materialNameEn?: string
  remark?: string
  variants?: CJVariant[]
  productImageSet?: string[]
}

interface CJVariant {
  vid: string
  variantNameEn: string
  variantSellPrice: string
  variantStock: number
  variantImage?: string
}

interface CJTokenResponse {
  result: boolean
  message: string
  data: {
    accessToken: string
    accessTokenExpiryDate: string
  }
}

interface CJSearchResponse {
  result: boolean
  data: {
    list: CJProduct[]
    total: number
  }
}

function mapCJProduct(p: CJProduct): RawSupplierProduct {
  const images: string[] = [p.productImage]
  if (p.productImageSet?.length) images.push(...p.productImageSet)

  const price = parseFloat(p.sellPrice ?? '0')

  const variants: RawVariant[] = (p.variants ?? []).map(v => ({
    id:      v.vid,
    name:    v.variantNameEn,
    options: [v.variantNameEn],
    price:   parseFloat(v.variantSellPrice ?? '0') || null,
    stock:   v.variantStock ?? 0,
  }))

  return {
    externalId:   p.pid,
    title:        p.productNameEn,
    description:  p.remark ?? p.productKeyEn ?? p.productNameEn,
    images:       [...new Set(images)].filter(Boolean),
    price,
    currency:     'USD',
    stock:        variants.reduce((acc, v) => acc + v.stock, 0) || 999,
    weight:       p.productWeight ? parseFloat(p.productWeight) : null,
    shippingTime: null,
    category:     p.categoryName ?? '',
    supplierName: 'CJ Dropshipping',
    supplierUrl:  `https://cjdropshipping.com/product/${p.pid}`,
    variants,
    rating:       null,
    reviewCount:  null,
  }
}

export class CJDropshippingAdapter implements ISupplierAdapter {
  name = 'cj'
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(
    private apiKey: string,
    private email: string
  ) {}

  /**
   * Obtém/renova token JWT Bearer da CJ API.
   * Token expira diariamente — cache até próxima expiração.
   */
  private async getToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    const res = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.apiKey }),
    })

    if (!res.ok) throw new Error(`CJ Auth error: ${res.status}`)
    const data: CJTokenResponse = await res.json()

    if (!data.result || !data.data?.accessToken) {
      throw new Error(`CJ Auth failed: ${data.message}`)
    }

    this.accessToken = data.data.accessToken
    this.tokenExpiry = new Date(data.data.accessTokenExpiryDate)
    return this.accessToken
  }

  /**
   * Faz chamada autenticada à CJ API com Bearer token.
   */
  private async request<T>(path: string, body?: object): Promise<T> {
    const token = await this.getToken()
    const res = await fetch(`${CJ_BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) throw new Error(`CJ API error ${res.status}: ${path}`)
    return res.json()
  }

  async search(params: SearchParams): Promise<RawSupplierProduct[]> {
    const data = await this.request<CJSearchResponse>('/product/list', {
      productNameEn: params.keywords.join(' '),
      minSellPrice:  params.priceMin,
      maxSellPrice:  params.priceMax,
      pageNum:       params.page,
      pageSize:      params.pageSize,
      ...(params.category ? { categoryId: params.category } : {}),
    })

    if (!data.result) return []
    return (data.data?.list ?? []).map(mapCJProduct)
  }

  async getProduct(externalId: string): Promise<RawSupplierProduct | null> {
    try {
      const data = await this.request<{ result: boolean; data: CJProduct }>(
        `/product/query?pid=${externalId}`
      )
      return data.result && data.data ? mapCJProduct(data.data) : null
    } catch {
      return null
    }
  }

  async getStock(externalIds: string[]): Promise<Record<string, number>> {
    try {
      const data = await this.request<{ result: boolean; data: Array<{ pid: string; stock: number }> }>(
        '/product/stock/queryByPid',
        { pids: externalIds }
      )
      if (!data.result) return Object.fromEntries(externalIds.map(id => [id, 0]))
      return Object.fromEntries((data.data ?? []).map(item => [item.pid, item.stock]))
    } catch {
      return Object.fromEntries(externalIds.map(id => [id, 0]))
    }
  }
}
