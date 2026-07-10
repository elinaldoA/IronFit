-- Baseline retroativo: as tabelas abaixo já existiam em produção antes do
-- histórico de migrations começar (a primeira migration versionada é
-- 20260702000000_push_reminders_setup.sql) — foram criadas direto pelo
-- dashboard do Supabase, então nunca ficaram reproduzíveis a partir do repo.
--
-- Reconstruído em 2026-07-10 a partir de uma introspecção somente leitura do
-- projeto de produção (information_schema + pg_catalog via
-- `supabase db query --linked`), sem rodar nada contra o banco. Datado antes
-- da primeira migration existente pra manter a ordem cronológica correta.
-- Todo `CREATE TABLE`/coluna usa guards (`if not exists`) e as policies usam
-- `drop policy if exists` + `create policy`, então é seguro reexecutar contra
-- um banco que já tem essas tabelas — não é pra ser aplicado automaticamente,
-- só documenta o estado real pra quem precisar reconstituir o banco do zero.
--
-- exercise_discomfort e push_subscriptions ficam de fora — já têm migration
-- própria (20260709020000 e 20260702000000). Colunas adicionadas depois por
-- outras migrations versionadas (food_logs.is_estimate, workouts.rating,
-- workout_plans.start_date/end_date/duration_weeks/next_plan_id/
-- regression_plan_id, progress_photos.storage_path) também ficam de fora
-- daqui de propósito — cada uma já é criada pela migration correspondente,
-- que roda depois desta na ordem cronológica.
--
-- Observações sobre o estado real encontrado (documentadas, não corrigidas):
-- • `personal_records` existe no banco mas nenhum código em app-react/src faz
--   `.from('personal_records')` — PRs são calculados on-the-fly em
--   lib/records.js a partir de exercise_sets. Parece tabela legada/não usada;
--   incluída aqui por fidelidade ao estado real.
-- • `profiles` só é usado por lib/avatar.js (coluna avatar_data) — o resto do
--   perfil do usuário vive em auth.users.user_metadata, não nessa tabela.
-- • `exercise_logs.carga_sem1..carga_sem4` parecem resquício de um esquema de
--   progressão semanal anterior ao exercise_sets atual (por série); nenhum
--   código em app-react/src os lê hoje.
-- • Sem triggers nem functions em `public` (confirmado via pg_trigger/
--   pg_proc) — os `updated_at` são default estático `now()`, não
--   auto-atualizados por trigger; o código grava esses campos explicitamente
--   onde precisa.
-- • Nem toda FK pra auth.users tem `on delete cascade` (ex.: weight_logs,
--   workouts, personal_records, profiles) — mantido fiel ao que já está em
--   produção, não "consertado" numa migration de documentação.

-- ============================================================
-- workout_plans / plan_days / plan_exercises
-- ============================================================

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

drop policy if exists "own workout_plans" on public.workout_plans;
create policy "own workout_plans" on public.workout_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  dia text not null,
  foco text not null default '',
  order_index integer not null default 0
);

alter table public.plan_days enable row level security;

drop policy if exists "own plan_days" on public.plan_days;
create policy "own plan_days" on public.plan_days
  for all
  using (auth.uid() = (select workout_plans.user_id from public.workout_plans where workout_plans.id = plan_days.plan_id))
  with check (auth.uid() = (select workout_plans.user_id from public.workout_plans where workout_plans.id = plan_days.plan_id));

create table if not exists public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days(id) on delete cascade,
  nome text not null,
  series text not null default '',
  reps text not null default '',
  descanso text not null default '',
  tecnica text not null default '',
  is_post_workout boolean not null default false,
  order_index integer not null default 0
);

alter table public.plan_exercises enable row level security;

drop policy if exists "own plan_exercises" on public.plan_exercises;
create policy "own plan_exercises" on public.plan_exercises
  for all
  using (auth.uid() = (select wp.user_id from public.workout_plans wp join public.plan_days pd on pd.plan_id = wp.id where pd.id = plan_exercises.plan_day_id))
  with check (auth.uid() = (select wp.user_id from public.workout_plans wp join public.plan_days pd on pd.plan_id = wp.id where pd.id = plan_exercises.plan_day_id));

-- ============================================================
-- workouts / exercise_logs / exercise_sets
-- ============================================================

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  workout_date date not null,
  day_of_week text not null,
  completed boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer
);

alter table public.workouts enable row level security;

drop policy if exists "Usuários podem ver seus próprios treinos" on public.workouts;
create policy "Usuários podem ver seus próprios treinos" on public.workouts
  for select using (auth.uid() = user_id);
drop policy if exists "Usuários podem inserir seus treinos" on public.workouts;
create policy "Usuários podem inserir seus treinos" on public.workouts
  for insert with check (auth.uid() = user_id);
drop policy if exists "Usuários podem atualizar seus treinos" on public.workouts;
create policy "Usuários podem atualizar seus treinos" on public.workouts
  for update using (auth.uid() = user_id);
drop policy if exists "Usuários podem deletar seus treinos" on public.workouts;
create policy "Usuários podem deletar seus treinos" on public.workouts
  for delete using (auth.uid() = user_id);

-- Snapshot dos exercícios planejados pra cada treino (template do dia no
-- momento em que o workout foi criado). carga_sem1..4: ver observação no
-- topo do arquivo — não lido por nenhum código atual.
create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  series text,
  reps text,
  rest_time text,
  technique text,
  carga_sem1 text,
  carga_sem2 text,
  carga_sem3 text,
  carga_sem4 text,
  is_post_workout boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.exercise_logs enable row level security;

drop policy if exists "Usuários podem ver seus logs" on public.exercise_logs;
create policy "Usuários podem ver seus logs" on public.exercise_logs
  for select using (exists (select 1 from public.workouts where workouts.id = exercise_logs.workout_id and workouts.user_id = auth.uid()));
drop policy if exists "Usuários podem inserir logs" on public.exercise_logs;
create policy "Usuários podem inserir logs" on public.exercise_logs
  for insert with check (exists (select 1 from public.workouts where workouts.id = exercise_logs.workout_id and workouts.user_id = auth.uid()));
drop policy if exists "Usuários podem atualizar logs" on public.exercise_logs;
create policy "Usuários podem atualizar logs" on public.exercise_logs
  for update using (exists (select 1 from public.workouts where workouts.id = exercise_logs.workout_id and workouts.user_id = auth.uid()));
drop policy if exists "Usuários podem deletar logs" on public.exercise_logs;
create policy "Usuários podem deletar logs" on public.exercise_logs
  for delete using (exists (select 1 from public.workouts where workouts.id = exercise_logs.workout_id and workouts.user_id = auth.uid()));

-- Séries de fato registradas pelo usuário (carga/reps por set_number), o que
-- de fato alimenta progressão/PRs/heatmap — diferente do template estático
-- em exercise_logs.
create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null,
  carga numeric,
  reps numeric,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workout_id, exercise_name, set_number)
);

create index if not exists exercise_sets_workout_idx on public.exercise_sets (workout_id);

alter table public.exercise_sets enable row level security;

drop policy if exists "select own sets" on public.exercise_sets;
create policy "select own sets" on public.exercise_sets
  for select using (exists (select 1 from public.workouts w where w.id = exercise_sets.workout_id and w.user_id = auth.uid()));
drop policy if exists "insert own sets" on public.exercise_sets;
create policy "insert own sets" on public.exercise_sets
  for insert with check (exists (select 1 from public.workouts w where w.id = exercise_sets.workout_id and w.user_id = auth.uid()));
drop policy if exists "update own sets" on public.exercise_sets;
create policy "update own sets" on public.exercise_sets
  for update
  using (exists (select 1 from public.workouts w where w.id = exercise_sets.workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = exercise_sets.workout_id and w.user_id = auth.uid()));

-- ============================================================
-- Dieta / água / peso
-- ============================================================

create table if not exists public.diet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_name text not null,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, log_date, meal_name)
);

alter table public.diet_logs enable row level security;

drop policy if exists "Usuários podem ver seus próprios diet_logs" on public.diet_logs;
create policy "Usuários podem ver seus próprios diet_logs" on public.diet_logs
  for select using (auth.uid() = user_id);
drop policy if exists "Usuários podem inserir seus próprios diet_logs" on public.diet_logs;
create policy "Usuários podem inserir seus próprios diet_logs" on public.diet_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "Usuários podem atualizar seus próprios diet_logs" on public.diet_logs;
create policy "Usuários podem atualizar seus próprios diet_logs" on public.diet_logs
  for update using (auth.uid() = user_id);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal_name text,
  food_name text not null,
  quantidade text,
  kcal numeric not null default 0,
  proteina numeric not null default 0,
  carboidrato numeric not null default 0,
  gordura numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.food_logs enable row level security;

drop policy if exists "own food_logs" on public.food_logs;
create policy "own food_logs" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  amount_ml integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.water_logs enable row level security;

drop policy if exists "Usuários podem ver seus próprios water_logs" on public.water_logs;
create policy "Usuários podem ver seus próprios water_logs" on public.water_logs
  for select using (auth.uid() = user_id);
drop policy if exists "Usuários podem inserir seus próprios water_logs" on public.water_logs;
create policy "Usuários podem inserir seus próprios water_logs" on public.water_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "Usuários podem atualizar seus próprios water_logs" on public.water_logs;
create policy "Usuários podem atualizar seus próprios water_logs" on public.water_logs
  for update using (auth.uid() = user_id);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  weight numeric not null,
  log_date date default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table public.weight_logs enable row level security;

drop policy if exists "Usuários podem ver seus pesos" on public.weight_logs;
create policy "Usuários podem ver seus pesos" on public.weight_logs
  for select using (auth.uid() = user_id);
drop policy if exists "Usuários podem inserir pesos" on public.weight_logs;
create policy "Usuários podem inserir pesos" on public.weight_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "Usuários podem atualizar pesos" on public.weight_logs;
create policy "Usuários podem atualizar pesos" on public.weight_logs
  for update using (auth.uid() = user_id);

-- ============================================================
-- Receitas salvas / conquistas / recordes / fotos / perfil
-- ============================================================

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kcal numeric not null default 0,
  proteina numeric not null default 0,
  carboidrato numeric not null default 0,
  gordura numeric not null default 0,
  ingredientes text,
  created_at timestamptz not null default now()
);

alter table public.saved_recipes enable row level security;

drop policy if exists "own saved_recipes" on public.saved_recipes;
create policy "own saved_recipes" on public.saved_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table public.achievements enable row level security;

drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ver observação no topo do arquivo: sem uso conhecido em app-react/src hoje
-- (PRs são calculados on-the-fly em lib/records.js a partir de exercise_sets).
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  exercise_name text not null,
  max_weight numeric,
  max_reps integer,
  achieved_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, exercise_name)
);

alter table public.personal_records enable row level security;

drop policy if exists "Usuários podem ver seus recordes" on public.personal_records;
create policy "Usuários podem ver seus recordes" on public.personal_records
  for select using (auth.uid() = user_id);
drop policy if exists "Usuários podem inserir recordes" on public.personal_records;
create policy "Usuários podem inserir recordes" on public.personal_records
  for insert with check (auth.uid() = user_id);
drop policy if exists "Usuários podem atualizar recordes" on public.personal_records;
create policy "Usuários podem atualizar recordes" on public.personal_records
  for update using (auth.uid() = user_id);

-- Fotos de progresso. storage_path (upload direto no Storage) é adicionado
-- depois por 20260703000000_progress_photos_storage.sql, que também derruba
-- o not null de image_data — fotos criadas antes dela usavam base64 direto
-- nessa coluna.
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_date date not null,
  image_data text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

drop policy if exists "own progress_photos" on public.progress_photos;
create policy "own progress_photos" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ver observação no topo do arquivo: só lido por lib/avatar.js (avatar_data).
-- O resto do perfil do usuário vive em auth.users.user_metadata.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  email text,
  weight numeric,
  height numeric,
  training_time text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  avatar_data text
);

alter table public.profiles enable row level security;

drop policy if exists "Usuários podem ver seus próprios perfis" on public.profiles;
create policy "Usuários podem ver seus próprios perfis" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Usuários podem inserir seus próprios perfis" on public.profiles;
create policy "Usuários podem inserir seus próprios perfis" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "Usuários podem atualizar seus próprios perfis" on public.profiles;
create policy "Usuários podem atualizar seus próprios perfis" on public.profiles
  for update using (auth.uid() = id);
