-- Papel de super admin + infraestrutura pro backoffice (app-admin).
--
-- A maior parte do perfil do usuário (nome, sexo, idade, peso, altura, meta,
-- nível, preferências) vive em auth.users.raw_user_meta_data — não em
-- public.profiles (que hoje só guarda avatar_data de fato, ver observação em
-- 20260701000000_baseline_schema.sql:28-29). Por isso admin_get_user/
-- admin_list_users leem auth.users diretamente via security definer, em vez
-- de só public.profiles.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- Lista enxuta pra tabela de usuários do backoffice.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  is_admin boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
           u.banned_until, coalesce(p.is_admin, false)
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- Detalhe de um usuário, incluindo raw_user_meta_data (onde de fato vivem
-- sexo/idade/peso/altura/meta/nivel/nome — ver comentário no topo do arquivo).
create or replace function public.admin_get_user(target uuid)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  is_admin boolean,
  user_metadata jsonb,
  avatar_data text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;

  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
           u.banned_until, coalesce(p.is_admin, false), u.raw_user_meta_data, p.avatar_data
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = target;
end;
$$;

grant execute on function public.admin_get_user(uuid) to authenticated;

-- Policy de bypass pro admin em cada tabela de dados do usuário (permissiva:
-- se soma via OR às policies "own <table>" já existentes, sem alterá-las).
do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'workout_plans', 'plan_days', 'plan_exercises', 'workouts',
    'exercise_logs', 'exercise_sets', 'diet_logs', 'food_logs', 'water_logs',
    'weight_logs', 'saved_recipes', 'achievements', 'personal_records',
    'progress_photos', 'push_subscriptions', 'exercise_discomfort'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format(
      'create policy "admin full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end $$;

-- Trilha de auditoria das ações administrativas destrutivas/sensíveis
-- (ban/unban/reset de senha/exclusão/edição de perfil de outro usuário),
-- gravada pela edge function admin-users.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  target_user_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin reads audit log" on public.admin_audit_log;
create policy "admin reads audit log" on public.admin_audit_log
  for select using (public.is_admin());
