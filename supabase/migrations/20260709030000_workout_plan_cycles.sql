-- Prazo de vigência por plano de treino (mesociclo). O usuário define uma
-- duração em semanas ao ativar um plano; start_date/end_date guardam o ciclo
-- calculado. next_plan_id/regression_plan_id encadeiam qual plano vira ativo
-- quando o prazo vence: o "seguinte" (progressão normal) e o "de recuperação"
-- (quando a evolução do ciclo foi ruim/estagnada) são planos distintos,
-- configuráveis independentemente. workout_plans.id é uuid (checado via REST
-- contra o projeto de produção antes de escrever esta migration).
alter table public.workout_plans
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists duration_weeks integer,
  add column if not exists next_plan_id uuid references public.workout_plans(id) on delete set null,
  add column if not exists regression_plan_id uuid references public.workout_plans(id) on delete set null;
