-- O item de cardio (esteira/escada/caminhada) do pós-treino aparecia antes dos
-- exercícios de abdômen. Passa a vir depois, junto com o reordenamento já
-- feito em treinoData.js. Só toca linhas de pós-treino com os nomes padrão do
-- app — planos já customizados pelo usuário com outros nomes não são afetados.

update public.plan_exercises pe
set order_index = v.order_index
from (values
  ('🔷 Abdominal Polia (Corda)',      0),
  ('🔷 Elevação de Pernas Pendurado', 1),
  ('🔷 Prancha com Peso',             2),
  ('🏃 Cardio — Esteira Inclinada',   3),

  ('🔷 Abdominal Supra com Halter',   0),
  ('🔷 Bicicleta no Solo',            1),
  ('🔷 Prancha Lateral com Elevação', 2),
  ('🏃 Cardio — Escada',              3),

  ('🔷 Crunch Invertido (banco)',     0),
  ('🔷 Russian Twist com Halter',     1),
  ('🔷 Prancha Frontal Estática',     2),
  ('🏃 Cardio — Caminhada Leve',      3),

  ('🔷 Abdominal na Máquina',         0),
  ('🔷 Tesoura (Scissor Kicks)',      1),
  ('🔷 Prancha com Braços Estendidos',2),
  ('🏃 Cardio — Caminhada (6km/h)',   3),

  ('🔷 Roda (Ab Wheel)',              0),
  ('🔷 Elevação de Pernas Deitado',   1),
  ('🔷 Prancha Lateral Estática',     2),
  ('🏃 Cardio — HIIT Esteira',        3)
) as v(nome, order_index)
where pe.nome = v.nome and pe.is_post_workout = true;
