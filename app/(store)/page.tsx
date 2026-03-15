import { HeroBanner } from '@/components/store/HeroBanner'
import { ProductCard } from '@/components/store/ProductCard'
import { createClient } from '@supabase/supabase-js'

// Next.js: Usar ISR revalidando a cada 1 hora para performance
export const revalidate = 3600

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Busca produtos ativos (política RLS `produtos_public_read` garante só acesso aos 'active')
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, titulo, preco_venda, preco_comparacao, imagens, slug')
    .eq('status', 'active')
    .limit(10)
    .order('created_at', { ascending: false })

  return (
    <div className="container" style={{ paddingBottom: '64px' }}>
      <HeroBanner />

      <section id="produtos" className="section" style={{ paddingTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h2 className="section-title">Lançamentos</h2>
            <p className="section-sub" style={{ marginBottom: 0 }}>Produtos selecionados especialmente para você.</p>
          </div>
          <a href="/ofertas" className="btn btn-ghost">Ver todos &rarr;</a>
        </div>

        {produtos && produtos.length > 0 ? (
          <div className="product-grid">
            {produtos.map((p) => (
              <ProductCard 
                key={p.id} 
                product={{
                  id: p.id,
                  title: p.titulo,
                  price: p.preco_venda,
                  priceCompare: p.preco_comparacao,
                  image: p.imagens?.[0] || '',
                  slug: p.slug
                }} 
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: '64px 0', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum produto publicado no momento. O motor de sourcing (workers) preencherá os produtos automaticamente.</p>
          </div>
        )}
      </section>
    </div>
  )
}
