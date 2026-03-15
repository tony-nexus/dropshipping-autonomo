'use client'

import { useCart } from '@/hooks/useCart'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalItems, subtotal } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="container section">Carregando...</div>

  if (items.length === 0) {
    return (
      <div className="container section" style={{ textAlign: 'center', paddingBlock: '80px' }}>
        <h1 className="section-title">Seu carrinho está vazio</h1>
        <p className="section-sub">Explore nossos produtos e encontre as melhores ofertas.</p>
        <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: '24px' }}>
          Voltar para a loja
        </Link>
      </div>
    )
  }

  return (
    <div className="container section">
      <h1 className="section-title" style={{ marginBottom: '32px' }}>Meu Carrinho ({totalItems})</h1>
      
      <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: '1fr', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="lg:col-span-2">
          {items.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', gap: '16px', padding: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg-muted)' }}>
                <Image src={item.image} alt={item.title} fill style={{ objectFit: 'cover' }} />
              </div>
              
              <div style={{ flex: 1 }}>
                <Link href={`/produtos/${item.productId}`} style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  {item.title}
                </Link>
                <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px' }}>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  -
                </button>
                <span style={{ width: '24px', textAlign: 'center', fontSize: '14px', fontWeight: 500 }}>{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  +
                </button>
              </div>
              
              <button 
                onClick={() => removeItem(item.id)}
                style={{ padding: '8px', color: 'var(--danger)', opacity: 0.8 }}
                aria-label="Remover"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Resumo do Pedido */}
        <div className="card" style={{ padding: '24px', position: 'sticky', top: '88px', background: 'var(--bg-muted)', border: 'none' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Resumo do Pedido</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <span>Subtotal</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: 'var(--text-muted)' }}>
            <span>Frete</span>
            <span>Calculado no checkout</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px', fontWeight: 800, fontSize: '20px' }}>
            <span>Total estimado</span>
            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
          </div>
          
          <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            Finalizar Compra
          </Link>
          
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-faint)' }}>
            Pagamento 100% seguro via Mercado Pago.
          </div>
        </div>
      </div>
    </div>
  )
}
