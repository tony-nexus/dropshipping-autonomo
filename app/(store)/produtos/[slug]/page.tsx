import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { AddToCartButton } from './AddToCartButton'

export const revalidate = 3600 // 1 hora de cache ISR

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: produto } = await supabase
    .from('produtos')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  if (!produto) {
    notFound()
  }

  const discount = produto.preco_comparacao 
    ? Math.round(((produto.preco_comparacao - produto.preco_venda) / produto.preco_comparacao) * 100)
    : 0

  const outOfStock = produto.estoque <= 0

  return (
    <div className="container" style={{ paddingBlock: '40px' }}>
      <div style={{ display: 'grid', gap: '48px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* Galeria de imagens simples */}
        <div style={{ position: 'relative', background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '1/1' }}>
          <Image 
            src={produto.imagens?.[0] || 'https://via.placeholder.com/800?text=Sem+Foto'}
            alt={produto.titulo}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>

        {/* Informações do produto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '16px' }}>
              {produto.titulo}
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span className="price-sale" style={{ fontSize: '32px' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco_venda)}
              </span>
              {produto.preco_comparacao && (
                <>
                  <span className="price-compare" style={{ fontSize: '20px' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco_comparacao)}
                  </span>
                  <span className="badge badge-danger">-{discount}%</span>
                </>
              )}
            </div>
            
            <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>
              Em até 12x no cartão
            </p>
          </div>

          <div style={{ padding: '24px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {produto.descricao || 'Sem descrição detalhada.'}
            </p>
          </div>

          <div style={{ marginTop: 'auto' }}>
             {/* Componente Client-Side para interação com o carrinho */}
             <AddToCartButton 
                product={{
                  id: produto.id,
                  title: produto.titulo,
                  price: produto.preco_venda,
                  priceCompare: produto.preco_comparacao,
                  image: produto.imagens?.[0] || '',
                  supplier: produto.fornecedor_nome,
                  supplierItemId: produto.fornecedor_item_id
                }}
                disabled={outOfStock}
             />
             
             <div style={{ marginTop: '16px', display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', alignItems: 'center' }}>
               <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
               {outOfStock ? <span style={{ color: 'var(--danger)' }}>Fora de estoque</span> : 'Estoque disponível'}
             </div>
             <div style={{ marginTop: '8px', display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', alignItems: 'center' }}>
               <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               Entrega rápida garantida
             </div>
          </div>
        </div>
      </div>
      
      {/* Detalhes avançados - HTML */}
      {produto.descricao_html && (
        <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
          <h2 className="section-title">Descrição do Produto</h2>
          <div 
            className="html-content"
            style={{ marginTop: '24px', lineHeight: 1.8, color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: produto.descricao_html }} 
          />
        </div>
      )}
    </div>
  )
}
