-- ============================================================
-- 003_cron_jobs.sql
-- Jobs pg_cron para workers automáticos
-- Requer pg_cron e pg_net instalados
-- ============================================================

-- ── Worker de sourcing: a cada 6 horas ───────────────────
SELECT cron.schedule(
  'sourcing-worker', '0 */6 * * *',
  $$ SELECT net.http_post(
    url     := current_setting('app.sourcing_worker_url'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.worker_secret')),
    body    := '{"trigger":"cron"}'::jsonb
  ); $$
);

-- ── Sincronização de estoque: a cada 1 hora ──────────────
SELECT cron.schedule(
  'sync-stock', '0 * * * *',
  $$ SELECT net.http_post(url := current_setting('app.sync_worker_url'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.worker_secret')),
    body := '{"trigger":"sync_stock"}'::jsonb); $$
);

-- ── Rastreamento de pedidos: a cada 4 horas ──────────────
SELECT cron.schedule(
  'sync-tracking', '0 */4 * * *',
  $$ SELECT net.http_post(url := current_setting('app.tracking_worker_url'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.worker_secret')),
    body := '{"trigger":"tracking"}'::jsonb); $$
);

-- ── Configurar as variáveis de app no Supabase ───────────
-- Executar no Supabase Dashboard → Settings → Configuration → Database Settings:
-- ALTER DATABASE postgres SET app.sourcing_worker_url = 'https://SEU-DOMINIO.com/api/admin/sourcing/trigger';
-- ALTER DATABASE postgres SET app.sync_worker_url     = 'https://SEU-DOMINIO.com/api/admin/sourcing/sync-stock';
-- ALTER DATABASE postgres SET app.tracking_worker_url  = 'https://SEU-DOMINIO.com/api/admin/sourcing/sync-tracking';
-- ALTER DATABASE postgres SET app.worker_secret        = 'SEU_WORKER_SECRET_KEY';
