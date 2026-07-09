-- Hardening pra abrir o app pra outras pessoas. Achado via `supabase db advisors
-- --linked` (security + performance), rodado contra o projeto de produção:
--
-- 1. Quase toda policy RLS chama `auth.uid()` direto, que o Postgres reavalia
--    linha a linha (lint auth_rls_initplan) — trocar por `(select auth.uid())`
--    é semanticamente idêntico (mesmo dono, mesma permissão), só permite o
--    planner cachear o valor. Importa a partir de mais usuários/linhas.
-- 2. `push_subscriptions` tinha duas policies idênticas (uma criada direto no
--    dashboard antes da migration 20260702000000_push_reminders_setup.sql, outra
--    por essa migration) — a duplicada roda em toda query à toa.
-- 3. Bucket de storage `avatars` tinha uma policy de SELECT sem filtro de dono
--    (`Anyone can view avatars`), permitindo listar todos os arquivos via API.
--    Bucket não é usado por nenhum código atual do app (só `progress-photos`,
--    que já é privado com signed URL) — a policy só habilitava listagem, então
--    removê-la não quebra nada em uso.
--
-- Propositalmente NÃO mexe em `profiles`, `exercise_logs`, `personal_records`:
-- não são referenciadas em lugar nenhum de app-react/src, mas o dono do produto
-- pediu pra deixar como estão por enquanto (não é esquecimento).

-- 1. Rewrap auth.uid() -> (select auth.uid()) nas tabelas usadas pelo app.
-- Cada bloco reproduz cmd/qual/with_check exatamente como estava (lido de
-- pg_policies antes de escrever esta migration), só envolvendo auth.uid().

drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem ver seus próprios diet_logs" on public.diet_logs;
create policy "Usuários podem ver seus próprios diet_logs" on public.diet_logs
  for select using ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem inserir seus próprios diet_logs" on public.diet_logs;
create policy "Usuários podem inserir seus próprios diet_logs" on public.diet_logs
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem atualizar seus próprios diet_logs" on public.diet_logs;
create policy "Usuários podem atualizar seus próprios diet_logs" on public.diet_logs
  for update using ((select auth.uid()) = user_id);

drop policy if exists "select own sets" on public.exercise_sets;
create policy "select own sets" on public.exercise_sets
  for select using (exists (select 1 from workouts w where w.id = exercise_sets.workout_id and w.user_id = (select auth.uid())));
drop policy if exists "insert own sets" on public.exercise_sets;
create policy "insert own sets" on public.exercise_sets
  for insert with check (exists (select 1 from workouts w where w.id = exercise_sets.workout_id and w.user_id = (select auth.uid())));
drop policy if exists "update own sets" on public.exercise_sets;
create policy "update own sets" on public.exercise_sets
  for update using (exists (select 1 from workouts w where w.id = exercise_sets.workout_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from workouts w where w.id = exercise_sets.workout_id and w.user_id = (select auth.uid())));

drop policy if exists "own food_logs" on public.food_logs;
create policy "own food_logs" on public.food_logs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own plan_days" on public.plan_days;
create policy "own plan_days" on public.plan_days
  for all using ((select auth.uid()) = (select workout_plans.user_id from workout_plans where workout_plans.id = plan_days.plan_id))
  with check ((select auth.uid()) = (select workout_plans.user_id from workout_plans where workout_plans.id = plan_days.plan_id));

drop policy if exists "own plan_exercises" on public.plan_exercises;
create policy "own plan_exercises" on public.plan_exercises
  for all using ((select auth.uid()) = (select wp.user_id from workout_plans wp join plan_days pd on pd.plan_id = wp.id where pd.id = plan_exercises.plan_day_id))
  with check ((select auth.uid()) = (select wp.user_id from workout_plans wp join plan_days pd on pd.plan_id = wp.id where pd.id = plan_exercises.plan_day_id));

drop policy if exists "own progress_photos" on public.progress_photos;
create policy "own progress_photos" on public.progress_photos
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own saved_recipes" on public.saved_recipes;
create policy "own saved_recipes" on public.saved_recipes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem ver seus próprios water_logs" on public.water_logs;
create policy "Usuários podem ver seus próprios water_logs" on public.water_logs
  for select using ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem inserir seus próprios water_logs" on public.water_logs;
create policy "Usuários podem inserir seus próprios water_logs" on public.water_logs
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem atualizar seus próprios water_logs" on public.water_logs;
create policy "Usuários podem atualizar seus próprios water_logs" on public.water_logs
  for update using ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem ver seus pesos" on public.weight_logs;
create policy "Usuários podem ver seus pesos" on public.weight_logs
  for select using ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem inserir pesos" on public.weight_logs;
create policy "Usuários podem inserir pesos" on public.weight_logs
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem atualizar pesos" on public.weight_logs;
create policy "Usuários podem atualizar pesos" on public.weight_logs
  for update using ((select auth.uid()) = user_id);

drop policy if exists "own workout_plans" on public.workout_plans;
create policy "own workout_plans" on public.workout_plans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem ver seus próprios treinos" on public.workouts;
create policy "Usuários podem ver seus próprios treinos" on public.workouts
  for select using ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem inserir seus treinos" on public.workouts;
create policy "Usuários podem inserir seus treinos" on public.workouts
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem atualizar seus treinos" on public.workouts;
create policy "Usuários podem atualizar seus treinos" on public.workouts
  for update using ((select auth.uid()) = user_id);
drop policy if exists "Usuários podem deletar seus treinos" on public.workouts;
create policy "Usuários podem deletar seus treinos" on public.workouts
  for delete using ((select auth.uid()) = user_id);

-- push_subscriptions: rewrap + remove a policy duplicada (mantém só a versionada).
drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
drop policy if exists "push_subscriptions_own_rows" on public.push_subscriptions;
create policy "push_subscriptions_own_rows" on public.push_subscriptions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 2. Storage: bucket avatars não é usado pelo app hoje — remove a policy que
-- permitia listar/ler qualquer arquivo do bucket via API (não afeta acesso por
-- URL pública direta, se o bucket já for público a nível de storage).
drop policy if exists "Anyone can view avatars" on storage.objects;
