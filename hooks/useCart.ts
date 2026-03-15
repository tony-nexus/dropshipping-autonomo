import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // product id + variant id
  productId: string
  title: string
  price: number
  priceCompare: number | null
  image: string
  quantity: number
  variant: string | null
  supplier: string
  supplierItemId: string
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  setCartOpen: (isOpen: boolean) => void
  get totalItems(): number
  get subtotal(): number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        const id = `${newItem.productId}-${newItem.variant || 'default'}`
        const items = get().items
        const existingItem = items.find((i) => i.id === id)

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === id ? { ...i, quantity: i.quantity + 1 } : i
            ),
            isOpen: true,
          })
        } else {
          set({
            items: [...items, { ...newItem, id, quantity: 1 }],
            isOpen: true,
          })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })
      },

      clearCart: () => set({ items: [] }),
      
      toggleCart: () => set({ isOpen: !get().isOpen }),
      
      setCartOpen: (isOpen) => set({ isOpen }),

      get totalItems() {
        return get().items.reduce((acc, item) => acc + item.quantity, 0)
      },

      get subtotal() {
        return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0)
      },
    }),
    {
      name: 'dropshipping-cart',
    }
  )
)
