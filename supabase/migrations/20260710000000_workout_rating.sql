-- Nota (1-5, com carinha) que o usuário dá ao treino no momento em que o
-- finaliza (WorkoutSummaryModal.jsx). Sem tabela separada: é 1 nota por
-- treino, mesmo grão de completed/duration_seconds já existentes em workouts.
alter table public.workouts
  add column if not exists rating smallint check (rating between 1 and 5);
