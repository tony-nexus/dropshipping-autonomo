-- ============================================================
-- 001_initial_schema.sql
-- Schema inicial do Sistema de Dropshipping Autônomo
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums tipados ─────────────────────────────────────────
CREATE TYPE order_status AS ENUM (
  'pending_payment', 'payment_approved', 'purchasing_supplier',
  'supplier_confirmed', 'shipped', 'in_transit', 'delivered',
  'cancelled', 'refunded'
);
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'boleto');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'approved', 'refused', 'refunded', 'chargeback');
CREATE TYPE product_status AS ENUM ('draft', 'active', 'paused', 'out_of_stock', 'removed');
CREATE TYPE log_level       AS ENUM ('info', 'warning', 'error', 'critical');

-- ── Tabela: administrador ────────────────────────────────
CREATE TABLE administrador (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  onboarding_ok BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: configuracoes_gerais ─────────────────────────
CREATE TABLE configuracoes_gerais (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id               UUID REFERENCES administrador(id) ON DELETE CASCADE UNIQUE NOT NULL,
  categorias_interesse   TEXT[] NOT NULL DEFAULT '{}',
  palavras_chave         TEXT[] NOT NULL DEFAULT '{}',
  preco_custo_min        NUMERIC(10,2) DEFAULT 0,
  preco_custo_max        NUMERIC(10,2) DEFAULT 9999.99,
  margem_lucro_pct       NUMERIC(5,2)  NOT NULL DEFAULT 40.00,
  markup_frete           NUMERIC(5,2)  DEFAULT 10.00,
  moeda_fornecedor       CHAR(3)       DEFAULT 'USD',
  nome_loja              TEXT NOT NULL DEFAULT 'Minha Loja',
  logo_url               TEXT,
  cor_primaria           CHAR(7)       DEFAULT '#000000',
  gateway_pagamento      TEXT DEFAULT 'mercadopago',
  gateway_access_token   TEXT,
  gateway_public_key     TEXT,
  aliexpress_app_key     TEXT,
  aliexpress_app_secret  TEXT,
  cj_api_key             TEXT,
  auto_publish           BOOLEAN DEFAULT TRUE,
  max_produtos_dia       INTEGER DEFAULT 50,
  transportadoras        TEXT[] DEFAULT '{"correios","melhor_envio"}',
  nfe_provider           TEXT DEFAULT 'focusnfe',
  nfe_token              TEXT,
  cnpj_emitente          TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: produtos ─────────────────────────────────────
CREATE TABLE produtos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id            UUID REFERENCES administrador(id) ON DELETE CASCADE NOT NULL,
  fornecedor_nome     TEXT NOT NULL,
  fornecedor_item_id  TEXT NOT NULL,
  fornecedor_url      TEXT,
  preco_custo         NUMERIC(10,2) NOT NULL,
  preco_custo_moeda   CHAR(3) DEFAULT 'BRL',
  titulo              TEXT NOT NULL,
  descricao           TEXT,
  descricao_html      TEXT,
  imagens             TEXT[] DEFAULT '{}',
  categorias          TEXT[] DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',
  sku                 TEXT UNIQUE,
  preco_venda         NUMERIC(10,2) NOT NULL,
  preco_comparacao    NUMERIC(10,2),
  peso_gramas         INTEGER,
  variantes           JSONB,
  estoque             INTEGER DEFAULT 0,
  estoque_alerta      INTEGER DEFAULT 5,
  status              product_status DEFAULT 'draft',
  destaque            BOOLEAN DEFAULT FALSE,
  meta_titulo         TEXT,
  meta_descricao      TEXT,
  slug                TEXT UNIQUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fornecedor_nome, fornecedor_item_id, admin_id)
);

-- ── Tabela: clientes ─────────────────────────────────────
CREATE TABLE clientes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  nome             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  telefone         TEXT,
  cpf_hash         TEXT, -- SHA-256, NUNCA plain text (LGPD)
  data_nascimento  DATE,
  enderecos        JSONB DEFAULT '[]'::jsonb,
  aceita_marketing BOOLEAN DEFAULT FALSE,
  lgpd_aceito_em   TIMESTAMPTZ,
  total_pedidos    INTEGER DEFAULT 0,
  total_gasto      NUMERIC(12,2) DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: pedidos ──────────────────────────────────────
CREATE TABLE pedidos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero              TEXT UNIQUE NOT NULL,
  cliente_id          UUID REFERENCES clientes(id) ON DELETE RESTRICT NOT NULL,
  admin_id            UUID REFERENCES administrador(id) ON DELETE RESTRICT NOT NULL,
  itens               JSONB NOT NULL,
  endereco_entrega    JSONB NOT NULL,
  subtotal            NUMERIC(10,2) NOT NULL,
  desconto            NUMERIC(10,2) DEFAULT 0,
  frete               NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  metodo_pagamento    payment_method NOT NULL DEFAULT 'pix',
  status_pagamento    payment_status DEFAULT 'pending',
  gateway_tx_id       TEXT,
  gateway_response    JSONB,
  pago_em             TIMESTAMPTZ,
  status              order_status DEFAULT 'pending_payment',
  fornecedor_order_id TEXT,
  codigo_rastreio     TEXT,
  transportadora      TEXT,
  nfe_numero          TEXT,
  nfe_chave           TEXT,
  nfe_pdf_url         TEXT,
  nfe_emitida_em      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: logs ─────────────────────────────────────────
CREATE TABLE logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nivel      log_level NOT NULL DEFAULT 'info',
  servico    TEXT NOT NULL,
  acao       TEXT NOT NULL,
  mensagem   TEXT,
  payload    JSONB,
  pedido_id  UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  user_id    UUID,
  ts         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Índices de performance ────────────────────────────────
CREATE INDEX idx_produtos_admin_status ON produtos(admin_id, status);
CREATE INDEX idx_produtos_slug         ON produtos(slug);
CREATE INDEX idx_produtos_categorias   ON produtos USING GIN(categorias);
CREATE INDEX idx_produtos_tags         ON produtos USING GIN(tags);
CREATE INDEX idx_pedidos_cliente       ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_status        ON pedidos(status);
CREATE INDEX idx_logs_ts               ON logs(ts DESC);
CREATE INDEX idx_logs_nivel            ON logs(nivel);

-- ── Auto-gerador de número de pedido ─────────────────────
CREATE SEQUENCE pedido_seq START 1;
CREATE OR REPLACE FUNCTION gerar_numero_pedido() RETURNS TEXT AS $$
BEGIN RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-'
  || LPAD(NEXTVAL('pedido_seq')::TEXT, 5, '0'); END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_numero_pedido() RETURNS TRIGGER AS $$
BEGIN IF NEW.numero IS NULL OR NEW.numero = '' THEN
  NEW.numero := gerar_numero_pedido(); END IF; RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_numero_pedido BEFORE INSERT ON pedidos
  FOR EACH ROW EXECUTE FUNCTION trigger_numero_pedido();

-- ── updated_at automático em todas as tabelas ─────────────
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admin_updated    BEFORE UPDATE ON administrador        FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_config_updated   BEFORE UPDATE ON configuracoes_gerais FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON produtos             FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes             FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_pedidos_updated  BEFORE UPDATE ON pedidos              FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
