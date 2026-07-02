-- Infraestrutura de lembretes via Web Push (envio pelo servidor, funciona com o
-- app fechado). Rode este script uma vez no SQL Editor do Supabase.
-- Documenta o que faltava: a Edge Function send-reminders existia só como
-- código-fonte no repo, sem tabela/policies/cron versionados e sem estar
-- de fato implantada.

-- 1. Extensões necessárias para o cron chamar a Edge Function via HTTP.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 2. Tabela de inscrições push (idempotente: cria só se ainda não existir).
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own_rows" on public.push_subscriptions;
create policy "push_subscriptions_own_rows"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Agenda a Edge Function send-reminders para rodar a cada minuto.
-- Pré-requisito: implantar a função (dashboard → Edge Functions → New function
-- "send-reminders", colar o código de supabase/functions/send-reminders/index.ts)
-- e desativar "Verify JWT" nela (é uma chamada interna do cron, sem usuário logado).
select cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://btzdetvoneyhzthsmdrp.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
