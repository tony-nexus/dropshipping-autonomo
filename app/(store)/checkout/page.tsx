'use client'

import { useCart } from '@/hooks/useCart'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const { items, subtotal } = useCart()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  if (items.length === 0) {
    router.push('/carrinho')
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Cria sessão no backend (Redis temporário) e retorna ID da sessão
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, subtotal, customer: formData })
      })

      if (!res.ok) throw new Error('Erro ao processar checkout')
      
      const { sessionId } = await res.json()
      
      // 2. Redireciona para o Gateway de Pagamento ou Payment Flow
      alert(`Sessão de checkout criada: ${sessionId}. Redirecionando para Mercado Pago...`)
      
      // router.push(`/checkout/payment?session_id=${sessionId}`)
      
    } catch (error) {
       alert('Erro ao tentar finalizar compra.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container section">
      <h1 className="section-title">Finalizar Compra</h1>
      <p className="section-sub">Preencha seus dados para entrega.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '48px', alignItems: 'start' }} className="lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="card" style={{ padding: '32px' }}>
          
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Dados Pessoais</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <input name="nome" value={formData.nome} onChange={handleChange} required placeholder="Nome completo" className="input" />
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="E-mail" className="input" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input name="cpf" value={formData.cpf} onChange={handleChange} required placeholder="CPF (Somente números)" className="input" />
              <input name="telefone" value={formData.telefone} onChange={handleChange} required placeholder="Telefone / WhatsApp" className="input" />
            </div>
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginTop: '32px', marginBottom: '24px' }}>Endereço de Entrega</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <input name="cep" value={formData.cep} onChange={handleChange} required placeholder="CEP" className="input" />
              <input name="logradouro" value={formData.logradouro} onChange={handleChange} required placeholder="Logradouro" className="input" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input name="numero" value={formData.numero} onChange={handleChange} required placeholder="Número" className="input" />
              <input name="complemento" value={formData.complemento} onChange={handleChange} placeholder="Complemento (Opcional)" className="input" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <input name="bairro" value={formData.bairro} onChange={handleChange} required placeholder="Bairro" className="input" />
              <input name="cidade" value={formData.cidade} onChange={handleChange} required placeholder="Cidade" className="input" />
              <input name="estado" value={formData.estado} onChange={handleChange} required placeholder="Estado (UF)" maxLength={2} className="input" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ marginTop: '32px', width: '100%' }}>
            {loading ? 'Processando...' : 'Ir para o Pagamento'}
          </button>
        </form>

        <div className="card" style={{ padding: '24px', background: 'var(--bg-muted)', border: 'none', position: 'sticky', top: '88px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Resumo</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '4px', background: '#ccc', overflow: 'hidden' }}>
                    <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--text)', color: '#fff', fontSize: '10px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>{item.quantity}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</p>
                  <p>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL'}).format(item.price)}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--success)' }}>
            <span>Frete (Correios)</span>
            <span>Grátis</span>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800 }}>
            <span>Total</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
