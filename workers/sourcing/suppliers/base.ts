// ============================================================
// workers/sourcing/suppliers/base.ts
// Contratos/interfaces base para todos os adaptadores de fornecedores
// ============================================================

export interface RawVariant {
  id: string
  name: string
  options: string[]
  price: number | null
  stock: number
}

export interface RawSupplierProduct {
  externalId: string
  title: string
  description: string
  images: string[]
  price: number
  currency: string
  stock: number
  weight: number | null
  shippingTime: string | null
  category: string
  supplierName: string
  supplierUrl: string
  variants: RawVariant[]
  rating: number | null
  reviewCount: number | null
}

export interface SearchParams {
  keywords: string[]
  priceMin: number      // em USD
  priceMax: number      // em USD
  page: number
  pageSize: number
  category?: string
}

export interface StockResult {
  externalId: string
  stock: number
  available: boolean
}

/**
 * Interface que todos os adaptadores de fornecedores devem implementar.
 * Garante contrato uniforme independente da API do fornecedor.
 */
export interface ISupplierAdapter {
  /** Nome identificador do fornecedor (ex: 'aliexpress', 'cj') */
  name: string

  /**
   * Busca produtos por keywords e filtros de preço.
   * Retorna lista normalizada no formato RawSupplierProduct.
   */
  search(params: SearchParams): Promise<RawSupplierProduct[]>

  /**
   * Busca detalhes completos de um produto pelo ID externo.
   * Retorna null se o produto não for encontrado.
   */
  getProduct(externalId: string): Promise<RawSupplierProduct | null>

  /**
   * Verifica estoque de múltiplos produtos batch.
   * Retorna mapa { externalId → stock }
   */
  getStock(externalIds: string[]): Promise<Record<string, number>>
}
