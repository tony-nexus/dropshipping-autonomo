'use client'

import { useCart } from '@/hooks/useCart'
import { useState } from 'react'

interface AddToCartProps {
  product: {
    id: string
    title: string
    price: number
    priceCompare: number | null
    image: string
    supplier: string
    supplierItemId: string
  }
  disabled?: boolean
}

export function AddToCartButton({ product, disabled }: AddToCartProps) {
  const { addItem } = useCart()
  const [loading, setLoading] = useState(false)

  const handleAdd = () => {
    setLoading(true)
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      priceCompare: product.priceCompare,
      image: product.image,
      variant: null, // Pode ser implementado seleção de variantes
      supplier: product.supplier,
      supplierItemId: product.supplierItemId
    })
    
    // Simula loading leve para feedback
    setTimeout(() => {
      setLoading(false)
    }, 300)
  }

  return (
    <button 
      onClick={handleAdd}
      disabled={disabled || loading}
      className="btn btn-primary btn-lg" 
      style={{ width: '100%' }}
    >
      {loading ? 'Adicionando...' : disabled ? 'Esgotado' : 'Adicionar ao Carrinho'}
    </button>
  )
}
