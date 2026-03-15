export default function OfertasPage() {
  return (
    <div className="container section" style={{ textAlign: 'center', paddingBlock: '80px' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏷️</div>
      <h1 className="section-title">Ofertas Especiais</h1>
      <p className="section-sub">As melhores promoções serão listadas aqui através do motor automático do Supabase.</p>
      
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px', background: 'var(--bg-muted)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Fique ligado!</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Nosso motor de precificação está buscando as melhores ofertas nos fornecedores no momento. Volte em breve para conferir descontos de até 50%.
        </p>
      </div>
    </div>
  )
}
