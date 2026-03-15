import Link from 'next/link'
import Image from 'next/image'

interface ProductCardProps {
  product: {
    id: string
    title: string
    price: number
    priceCompare: number | null
    image: string
    slug: string
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = product.priceCompare 
    ? Math.round(((product.priceCompare - product.price) / product.priceCompare) * 100)
    : 0

  return (
    <Link href={`/produtos/${product.slug}`} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', width: '100%', backgroundColor: 'var(--bg-muted)' }}>
        <Image 
          src={product.image || 'https://via.placeholder.com/400?text=Sem+Foto'}
          alt={product.title}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {discount > 0 && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'var(--danger)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            -{discount}%
          </div>
        )}
      </div>
      
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: 500, 
          marginBottom: '8px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1
        }}>
          {product.title}
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
          <span className="price-sale">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
          </span>
          {product.priceCompare && (
            <span className="price-compare">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceCompare)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
