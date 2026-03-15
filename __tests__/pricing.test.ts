import { describe, it, expect } from 'vitest'
import { calcularPreco } from '../lib/pricing'

describe('calcularPreco', () => {
  it('aplica margem sobre preço de venda corretamente', () => {
    const result = calcularPreco(10, {
      margemLucroPct: 40,
      markupFrete: 10,
      moedaFornecedor: 'USD',
    }, 5.10)
    
    // custo = 10 × 5.10 = 51 BRL
    // base  = 51 × 1.10 = 56.10
    // preço = 56.10 / 0.60 = 93.50 → arredonda para 93.90
    expect(result.precoFinal).toBe(93.90)
    expect(result.precoCusto).toBe(51.00)
    expect(result.margemRealPct).toBeGreaterThan(35)
  })

  it('arredonda para .90 quando decimal está entre .45 e .94', () => {
    const r = calcularPreco(5, { margemLucroPct: 50, markupFrete: 0, moedaFornecedor: 'BRL' }, 1)
    
    // custo = 5
    // base = 5
    // preco_exato = 5 / 0.50 = 10 -> arredonda para 9.99
    expect(r.precoFinal).toBe(9.99)
  })

  it('usa BRL diretamente sem conversão de dólar', () => {
    const r = calcularPreco(100, { margemLucroPct: 40, markupFrete: 10, moedaFornecedor: 'BRL' }, 5.10)
    expect(r.precoCusto).toBe(100) // não foi multiplicado por 5.10
  })
})
