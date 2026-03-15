import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

export default async function PedidosPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: pedidos } = await supabaseAdmin
    .from('pedidos')
    .select('*, clientes(nome)')
    .order('created_at', { ascending: false })
    .limit(50)

  // Labels de tradução do status
  const STATUS_MAP: Record<string, string> = {
    pending_payment: 'Aguardando Pgto',
    payment_approved: 'Pago',
    purchasing_supplier: 'Comprando',
    supplier_confirmed: 'Confirmado Forn.',
    shipped: 'Enviado',
    in_transit: 'Em trânsito',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado'
  }

  const BADGE_MAP: Record<string, string> = {
    pending_payment: 'badge-warning',
    payment_approved: 'badge-primary',
    purchasing_supplier: 'badge-warning',
    supplier_confirmed: 'badge-primary',
    shipped: 'badge-primary',
    in_transit: 'badge-success',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    refunded: 'badge-danger'
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="section-title">Gerenciar Pedidos</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input type="text" placeholder="Buscar pedido..." className="input" style={{ width: '260px' }} />
          <button className="btn btn-primary">Filtros</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Pedido</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Data</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Cliente</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Total</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos?.map(pedido => (
                <tr key={pedido.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>{pedido.numero}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {pedido.clientes?.nome || 'Anônimo'}
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.total)}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span className={`badge ${BADGE_MAP[pedido.status] || 'badge-success'}`}>
                      {STATUS_MAP[pedido.status] || pedido.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm">Detalhes</button>
                  </td>
                </tr>
              ))}
              
              {!pedidos?.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
