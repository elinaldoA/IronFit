-- upsertWeightLog (app-react/src/lib/weightLog.js) fazia find-then-update/insert
-- em vez de upsert de verdade, porque weight_logs não tinha uma unique
-- constraint pra apoiar onConflict — duas gravações concorrentes no mesmo dia
-- podiam ambas encontrar "não existe" e inserir duas linhas. Passa a usar
-- upsert(onConflict: 'user_id,log_date'), igual diet_logs/water_logs já fazem.
--
-- Antes de adicionar a constraint, remove duplicatas existentes (mantém a
-- mais recente por created_at, com id como desempate) — senão o ADD
-- CONSTRAINT falha se já houver duplicidade em produção.

delete from public.weight_logs a
using public.weight_logs b
where a.user_id = b.user_id
  and a.log_date = b.log_date
  and (a.created_at, a.id) < (b.created_at, b.id);

alter table public.weight_logs
  add constraint weight_logs_user_id_log_date_key unique (user_id, log_date);
