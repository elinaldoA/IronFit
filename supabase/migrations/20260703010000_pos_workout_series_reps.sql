-- Itens de pós-treino (cardio + abdômen) guardavam série/reps fixos como '-'
-- e todo o texto descritivo empilhado no campo tecnica. Isso impedia a tela de
-- treino de abrir campos de carga/reps por série para os exercícios de abdômen,
-- do mesmo jeito que já existe para os exercícios principais. Este UPDATE só
-- toca linhas com is_post_workout = true cujo nome bate com os itens padrão do
-- treinoData.js — planos já customizados pelo usuário com outros nomes não são
-- afetados.

update public.plan_exercises pe
set series = v.series, reps = v.reps, descanso = v.descanso, tecnica = v.tecnica
from (values
  ('🏃 Cardio — Esteira Inclinada',   '-', '20min · 10% inclinação / 5km/h',        '-',   ''),
  ('🔷 Abdominal Polia (Corda)',      '4', '12-15',                                  '45s', 'Pico de contração'),
  ('🔷 Elevação de Pernas Pendurado', '3', 'até a falha (máx 20)',                   '45s', 'Máximo alongamento'),
  ('🔷 Prancha com Peso',             '3', '45s',                                    '45s', 'Isometria com carga'),

  ('🏃 Cardio — Escada',              '-', '20min · Moderado (130bpm)',              '-',   ''),
  ('🔷 Abdominal Supra com Halter',   '3', '15-20',                                  '45s', 'Carga moderada'),
  ('🔷 Bicicleta no Solo',            '3', '20 cada perna',                          '45s', 'Movimento alternado'),
  ('🔷 Prancha Lateral com Elevação', '3', '30s cada lado',                          '45s', 'Estabilidade dinâmica'),

  ('🏃 Cardio — Caminhada Leve',      '-', '10min · Resfriamento',                   '-',   ''),
  ('🔷 Crunch Invertido (banco)',     '4', '15',                                     '45s', 'Levanta quadril'),
  ('🔷 Russian Twist com Halter',     '3', '20 cada lado',                           '45s', 'Rotação tronco'),
  ('🔷 Prancha Frontal Estática',     '3', '60s',                                    '45s', 'Isometria máxima'),

  ('🏃 Cardio — Caminhada (6km/h)',   '-', '25min · Moderado',                       '-',   ''),
  ('🔷 Abdominal na Máquina',         '4', '12-15',                                  '45s', 'Carga controlada'),
  ('🔷 Tesoura (Scissor Kicks)',      '3', '20 cada perna',                          '45s', 'Alonga ísquios'),
  ('🔷 Prancha com Braços Estendidos','3', '45s',                                    '45s', 'Ativa peitoral e core'),

  ('🏃 Cardio — HIIT Esteira',        '-', '15min · 1min corre / 2min caminha',      '-',   ''),
  ('🔷 Roda (Ab Wheel)',              '4', '10-12',                                  '45s', 'Extensão total core'),
  ('🔷 Elevação de Pernas Deitado',   '3', '15-20',                                  '45s', 'Toque os pés'),
  ('🔷 Prancha Lateral Estática',     '3', '45s cada lado',                          '45s', 'Estabilidade unilateral')
) as v(nome, series, reps, descanso, tecnica)
where pe.nome = v.nome and pe.is_post_workout = true;
