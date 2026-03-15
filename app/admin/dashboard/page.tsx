import { createClient } from '@supabase/supabase-js'
import { StatsCard } from '@/components/admin/StatsCard'

export const revalidate = 0 // não faz cache no admin

export default async function DashboardPage() {
  // Chamada privilegiada no dashboard para pegar as métricas globais do admin logado
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Em produção, deve filtrar por auth() / sessão para o `admin_id` correto
  // Estou pegando totais gerais aqui para fins de MVP

  const { count: countPedidos } = await supabaseAdmin
    .from('pedidos')
    .select('*', { count: 'exact', head: true })

  const { count: countProdutos } = await supabaseAdmin
    .from('produtos')
    .select('*', { count: 'exact', head: true })

  const { count: countClientes } = await supabaseAdmin
    .from('clientes')
    .select('*', { count: 'exact', head: true })

  const { data: receitasData } = await supabaseAdmin
    .from('pedidos')
    .select('subtotal')
    .eq('status', 'payment_approved')

  const receitaTotal = receitasData?.reduce((acc, p) => acc + Number(p.subtotal), 0) || 0

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="section-title">Meu Painel</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline">Exportar</button>
          <button className="btn btn-primary">Novo Relatório</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        <StatsCard 
          title="Receita Total" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receitaTotal)} 
          trend={{ value: 12.5, label: 'vs último mês', isPositive: true }}
        />
        <StatsCard 
          title="Total de Pedidos" 
          value={countPedidos || 0} 
          trend={{ value: 4.2, label: 'vs último mês', isPositive: true }}
        />
        <StatsCard 
          title="Produtos Publicados" 
          value={countProdutos || 0} 
          trend={{ value: 2.1, label: 'vs último mês', isPositive: false }}
        />
        <StatsCard 
          title="Clientes Ativos" 
          value={countClientes || 0} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '32px' }} className="lg:grid-cols-2">
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Desempenho de Vendas</h2>
          <div style={{ height: '300px', background: 'var(--bg-muted)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
            [ Gráfico de Linha Placeholder ]
          </div>
        </div>
        
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Pedidos Recentes</h2>
          <div style={{ height: '300px', background: 'var(--bg-muted)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
            [ Lista Compacta Placeholder ]
          </div>
        </div>
      </div>
    </div>
  )
}
