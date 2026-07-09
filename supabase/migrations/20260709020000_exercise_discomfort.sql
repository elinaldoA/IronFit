-- Registro de dor/desconforto/lesão por exercício. Usado hoje pra avisar o
-- usuário quando o mesmo exercício reincide (ExerciseBlock em TreinoPage.jsx);
-- mais adiante vira um sinal de segurança na decisão de evolução do plano.
create table if not exists public.exercise_discomfort (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  log_date date not null,
  severity text not null check (severity in ('leve', 'moderada', 'forte', 'lesao')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.exercise_discomfort enable row level security;

drop policy if exists "own exercise_discomfort" on public.exercise_discomfort;
create policy "own exercise_discomfort" on public.exercise_discomfort
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists exercise_discomfort_user_exercise_idx
  on public.exercise_discomfort (user_id, exercise_name, log_date desc);
