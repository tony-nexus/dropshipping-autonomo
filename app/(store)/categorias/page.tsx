import Link from 'next/link'

export default function CategoriasPage() {
  const categorias = [
    { nome: 'Eletrônicos', slug: 'eletronicos', icon: '📱' },
    { nome: 'Moda', slug: 'moda', icon: '👕' },
    { nome: 'Casa e Decoração', slug: 'casa', icon: '🏠' },
    { nome: 'Beleza e Saúde', slug: 'beleza', icon: '💄' },
    { nome: 'Esportes', slug: 'esportes', icon: '⚽' },
    { nome: 'Pet Shop', slug: 'pet', icon: '🐕' },
  ]

  return (
    <div className="container section">
      <h1 className="section-title">Categorias</h1>
      <p className="section-sub">Explore nossos produtos por departamento.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '24px',
        marginTop: '32px'
      }}>
        {categorias.map(cat => (
          <Link key={cat.slug} href={`/categorias/${cat.slug}`} className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            gap: '16px',
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '48px' }}>{cat.icon}</span>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{cat.nome}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
