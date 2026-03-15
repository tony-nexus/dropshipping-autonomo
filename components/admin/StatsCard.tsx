interface StatsCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
}

export function StatsCard({ title, value, trend }: StatsCardProps) {
  return (
    <div className="card" style={{ padding: '24px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>{title}</p>
      <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text)', marginBottom: trend ? '12px' : 0 }}>
        {value}
      </div>
      
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500 }}>
          <span className={`badge ${trend.isPositive ? 'badge-success' : 'badge-danger'}`} style={{ gap: '2px' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" style={{ transform: trend.isPositive ? 'none' : 'rotate(180deg)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {trend.value}%
          </span>
          <span style={{ color: 'var(--text-faint)' }}>{trend.label}</span>
        </div>
      )}
    </div>
  )
}
