import { Navbar } from '@/components/store/Navbar'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <footer style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '48px 0',
        marginTop: 'auto'
      }}>
        <div className="container" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
          <p>© {new Date().getFullYear()} DropStore. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
            <span>Termos de Serviço</span>
            <span>Política de Privacidade</span>
            <span>Trocas e Devoluções</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
