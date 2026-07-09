-- Distingue alimentos registrados manualmente de estimativas geradas
-- automaticamente quando o usuário marca uma refeição como feita sem
-- registrar um alimento específico nela (ver DietaPage.jsx setMealEstimate).
-- Sem essa coluna, o histórico de kcal/macros na tela de Evolução não tinha
-- como enxergar dias em que a refeição só foi marcada via check.
alter table public.food_logs
  add column if not exists is_estimate boolean not null default false;
