-- ============================================================
-- 002_row_level_security.sql
-- Row Level Security — isolamento por admin_id
-- ============================================================

ALTER TABLE administrador        ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_gerais ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs                 ENABLE ROW LEVEL SECURITY;

-- ── Admin vê apenas seus próprios dados ──────────────────
CREATE POLICY admin_self ON administrador
  FOR ALL USING (user_id = auth.uid());

-- ── Config pertence ao admin autenticado ─────────────────
CREATE POLICY config_owner ON configuracoes_gerais FOR ALL
  USING (admin_id = (SELECT id FROM administrador WHERE user_id = auth.uid()));

-- ── Admin: acesso total aos seus produtos ────────────────
CREATE POLICY produtos_admin ON produtos FOR ALL
  USING (admin_id = (SELECT id FROM administrador WHERE user_id = auth.uid()));

-- ── Público anônimo: lê APENAS produtos ativos (loja pública)
CREATE POLICY produtos_public_read ON produtos
  FOR SELECT USING (status = 'active');

-- ── Cliente vê apenas seus próprios dados ────────────────
CREATE POLICY cliente_self ON clientes FOR ALL
  USING (user_id = auth.uid());

-- ── Cliente vê apenas seus pedidos ──────────────────────
CREATE POLICY pedidos_cliente ON pedidos FOR SELECT
  USING (cliente_id = (SELECT id FROM clientes WHERE user_id = auth.uid()));

-- ── Admin vê e gerencia todos os pedidos da sua loja ─────
CREATE POLICY pedidos_admin ON pedidos FOR ALL
  USING (admin_id = (SELECT id FROM administrador WHERE user_id = auth.uid()));

-- ── Apenas admins leem logs (service role escreve via SERVICE_ROLE_KEY)
CREATE POLICY logs_admin_read ON logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM administrador WHERE user_id = auth.uid()));
