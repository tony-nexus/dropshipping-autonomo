import Link from 'next/link'

export function HeroBanner() {
  return (
    <section style={{
      position: 'relative',
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
      color: '#fff',
      padding: '80px 0',
      overflow: 'hidden',
      borderRadius: 'var(--radius-lg)',
      margin: '24px 0'
    }}>
      {/* Círculos decorativos */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        left: '20%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.05)'
      }}></div>

      <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <h1 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: 'clamp(32px, 5vw, 56px)', 
          lineHeight: 1.1,
          fontWeight: 800,
          marginBottom: '24px',
          letterSpacing: '-1px'
        }} className="fade-in">
          Os melhores produtos,<br /> direto para você.
        </h1>
        
        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)',
          opacity: 0.9,
          maxWidth: '600px',
          margin: '0 auto 40px',
          fontWeight: 400
        }} className="fade-in-delay">
          Selecionamos produtos de alta qualidade com entrega rápida e garantida para todo o Brasil. Aproveite as ofertas limitadas!
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }} className="fade-in-delay">
          <Link href="#produtos" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)' }}>
            Ver Ofertas
          </Link>
          <Link href="/categorias" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            Explorar Categorias
          </Link>
        </div>
      </div>
    </section>
  )
}
