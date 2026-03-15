'use client'

import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { useEffect, useState } from 'react'

export function Navbar() {
  const { totalItems, toggleCart } = useCart()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration error due to Zustand persist
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px'
      }}>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px' }}>
            DROP<span style={{ color: 'var(--primary)' }}>STORE</span>
          </Link>

          <nav style={{ display: 'flex', gap: '20px' }} className="hidden sm:flex">
            <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Início</Link>
            <Link href="/categorias" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Categorias</Link>
            <Link href="/ofertas" style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Ofertas</Link>
          </nav>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button style={{ padding: '8px', color: 'var(--text-muted)' }} aria-label="Buscar">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
          
          <button 
            onClick={toggleCart}
            style={{ position: 'relative', padding: '8px', color: 'var(--text)' }} 
            aria-label="Carrinho"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            {mounted && totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '0',
                right: '0',
                background: 'var(--primary)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transform: 'translate(20%, -20%)'
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
