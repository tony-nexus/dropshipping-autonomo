'use client'

import { useOnboarding } from '@/hooks/useOnboarding'

export default function OnboardingPage() {
  const { currentStep, stepIndex, state, updateState, advanceStep, completeOnboarding, loading, error } = useOnboarding()

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentStep === 'gateways_shipping') {
      completeOnboarding()
    } else {
      advanceStep()
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto' }}>
      <h1 className="section-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Configuração da Loja</h1>
      <p className="section-sub" style={{ textAlign: 'center', marginBottom: '40px' }}>
        Preencha os dados abaixo para darmos início ao motor de Sourcing.
      </p>

      {/* Progress Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[0, 1, 2].map(idx => (
          <div key={idx} style={{ 
            flex: 1, 
            height: '4px', 
            borderRadius: '2px', 
            background: stepIndex >= idx ? 'var(--primary)' : 'var(--border)' 
          }} />
        ))}
      </div>

      <div className="card" style={{ padding: '32px' }}>
        {error && (
          <div style={{ background: 'var(--danger)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: '24px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleNext}>
          {currentStep === 'store_info' && (
            <div style={{ display: 'grid', gap: '16px' }} className="fade-in">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Etapa 1: Dados da Loja</h2>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Nome da Loja</label>
                <input 
                  required 
                  className="input" 
                  value={state.nomeLoja} 
                  onChange={(e) => updateState({ nomeLoja: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Cor Primária (Hex)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="color" 
                    value={state.corPrimaria} 
                    onChange={(e) => updateState({ corPrimaria: e.target.value })} 
                    style={{ height: '42px', width: '42px', padding: '2px', cursor: 'pointer' }}
                  />
                  <input 
                    className="input" 
                    value={state.corPrimaria} 
                    onChange={(e) => updateState({ corPrimaria: e.target.value })} 
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 'sourcing_preferences' && (
            <div style={{ display: 'grid', gap: '16px' }} className="fade-in">
               <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Etapa 2: Motor de Automação (Sourcing)</h2>
               <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Palavras-chave (separadas por vírgula)</label>
                  <input 
                    required 
                    className="input" 
                    placeholder="ex: relogios, moda feminina, tech"
                    value={state.palavrasChave.join(', ')} 
                    onChange={(e) => updateState({ palavrasChave: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                  />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Custo Mínimo (USD)</label>
                    <input type="number" min="0" step="0.1" className="input" value={state.precoCustoMin} onChange={(e) => updateState({ precoCustoMin: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Custo Máximo (USD)</label>
                    <input type="number" min="0" step="0.1" className="input" value={state.precoCustoMax} onChange={(e) => updateState({ precoCustoMax: Number(e.target.value) })} />
                  </div>
               </div>
               <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Margem de Lucro Bruto (%)</label>
                  <input type="number" min="5" className="input" value={state.margemLucroPct} onChange={(e) => updateState({ margemLucroPct: Number(e.target.value) })} />
               </div>
            </div>
          )}

          {currentStep === 'gateways_shipping' && (
            <div style={{ display: 'grid', gap: '16px' }} className="fade-in">
               <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Etapa 3: Integração Completa</h2>
               <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Gateway de Pagamento</label>
                  <select 
                    className="input" 
                    value={state.gatewayPagamento} 
                    onChange={(e) => updateState({ gatewayPagamento: e.target.value as 'mercadopago' | 'pagarme' })}
                  >
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="pagarme">Pagar.me</option>
                  </select>
               </div>
               <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Access Token do Gateway</label>
                  <input 
                    required 
                    type="password"
                    className="input" 
                    value={state.gatewayAccessToken} 
                    onChange={(e) => updateState({ gatewayAccessToken: e.target.value })} 
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>O Access Token é encriptado via Supabase RLS na persistência.</p>
               </div>
            </div>
          )}

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ minWidth: '140px' }}>
              {loading ? 'Processando...' : currentStep === 'gateways_shipping' ? 'Finalizar e Instalar' : 'Próxima Etapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
