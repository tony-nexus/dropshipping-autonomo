// ============================================================
// lib/pricing.ts
// Calculadora de preços com conversão de moeda e precificação
// psicológica (.90/.99)
// ============================================================

export interface PricingResult {
  precoCusto: number       // custo em BRL
  precoFinal: number       // preço de venda final
  precoComparacao: number  // preço "riscado" (30% acima do final)
  margemRealPct: number    // margem real sobre o preço de venda
}

export interface PricingConfig {
  margemLucroPct: number    // ex: 40 = 40%
  markupFrete: number       // ex: 10 = 10%
  moedaFornecedor: string   // 'USD', 'CNY', 'BRL'
}

/**
 * Calcula o preço de venda final de um produto importado.
 *
 * Fórmula:
 *   base         = custo_BRL × (1 + markupFrete%)
 *   precoFinal   = base / (1 - margem%)
 *
 * @param precoCustoOriginal - Preço de custo na moeda do fornecedor
 * @param config             - Configurações de margem e markup
 * @param taxaCambio         - Taxa USD→BRL (default 5.10 fallback)
 */
export function calcularPreco(
  precoCustoOriginal: number,
  config: PricingConfig,
  taxaCambio: number = 5.10
): PricingResult {
  const fatorCambio = config.moedaFornecedor === 'BRL' ? 1 : taxaCambio
  const precoCustoBRL = precoCustoOriginal * fatorCambio

  // Base = custo + markup frete para cobrir imprevistos
  const base = precoCustoBRL * (1 + config.markupFrete / 100)

  // Margem sobre preço de venda: preço = base / (1 - margem%)
  const precoExato = base / (1 - config.margemLucroPct / 100)
  const precoFinal = arredondarPreco(precoExato)  // ex: 29.90, 49.99

  return {
    precoCusto:      round(precoCustoBRL),
    precoFinal,
    precoComparacao: arredondarPreco(precoFinal * 1.3),  // preço riscado
    margemRealPct:   round(((precoFinal - base) / precoFinal) * 100),
  }
}

/**
 * Arredonda valor para preço psicológico:
 *   .00-.44 → X.99  (ex: 29.20 → 28.99)
 *   .45-.94 → X.90  (ex: 29.50 → 29.90)
 *   .95-.99 → X.99  (ex: 29.97 → 29.99)
 */
function arredondarPreco(valor: number): number {
  const int = Math.floor(valor)
  const dec = valor - int
  if (dec < 0.45) return round(int - 0.01)  // 29.99
  if (dec < 0.95) return round(int + 0.90)  // 29.90
  return round(int + 0.99)                  // 29.99
}

function round(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * Busca taxa de câmbio USD→BRL via AwesomeAPI.
 * Fallback: 5.10 em caso de falha.
 */
export async function buscarTaxaCambio(): Promise<number> {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      next: { revalidate: 3600 } // cache 1h no Next.js
    })
    if (!res.ok) throw new Error('API indisponível')
    const data = await res.json()
    const taxa = parseFloat(data?.USDBRL?.ask)
    if (!isNaN(taxa) && taxa > 0) return taxa
    throw new Error('Taxa inválida')
  } catch {
    // Fallback seguro
    return 5.10
  }
}
