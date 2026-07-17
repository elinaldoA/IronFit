-- Dá ao admin controle sobre o conteúdo da landing page pública
-- (app-react/public/landing/index.html), que hoje é HTML estático sem
-- nenhuma dimensão editável.
--
-- landing_content é uma tabela singleton (id fixo = 1, forçado pelo check):
-- uma linha só, uma coluna `content` jsonb com a árvore inteira da página
-- (cor principal + lista ordenada de seções, cada uma com enabled/type e os
-- campos daquele tipo). A landing page (estática, sem build step, sem
-- supabase-js) busca essa linha direto via REST com a chave pública anon no
-- carregamento e substitui o texto/ordem/visibilidade padrão que já vem no
-- HTML — ver o <script> no fim de app-react/public/landing/index.html. O
-- HTML embutido continua sendo o fallback (SEO, JS desabilitado, fetch
-- falhou), por isso o seed abaixo espelha exatamente o texto que já existia
-- ali antes desta migration.
--
-- app-admin/src/pages/LandingEditor.jsx é quem escreve aqui. As chaves de
-- ícone usadas em highlights/features ("cloud", "download", "wifi-off",
-- "tag", "activity", "droplet", "chart", "user") precisam bater com o mapa
-- ICONS no <script> da landing page — mudar um lado sem o outro faz o ícone
-- cair no fallback.

create table if not exists public.landing_content (
  id int primary key default 1 check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.landing_content enable row level security;

drop policy if exists "anyone can read landing_content" on public.landing_content;
create policy "anyone can read landing_content" on public.landing_content
  for select using (true);

drop policy if exists "admin full access" on public.landing_content;
create policy "admin full access" on public.landing_content
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.landing_content (id, content) values (1, $land$
{"theme":{"primaryColor":"#f97316"},"sections":[
{"id":"hero","type":"hero","enabled":true,"badge":"Grátis · instalável · funciona offline","titleTop":"Pare de treinar sem rumo.","titleBottom":"Veja sua evolução","titleHighlight":"acontecer de verdade","lead":"Chega de planilha perdida, carga esquecida e dieta no achismo. O EAFIT monta seu treino, sua dieta e mostra sua evolução — semana a semana, série a série.","ctaPrimaryLabel":"Abrir o app grátis","ctaSecondaryLabel":"Ver funcionalidades"},
{"id":"highlights","type":"highlights","enabled":true,"items":[{"icon":"cloud","label":"Sync automático"},{"icon":"download","label":"Instalável"},{"icon":"wifi-off","label":"Funciona offline"},{"icon":"tag","label":"100% grátis"}]},
{"id":"compare","type":"compare","enabled":true,"title":"Sua rotina hoje vs. sua rotina com o EAFIT","subtitle":"A diferença entre treinar por treinar e treinar com propósito.","badLabel":"Sem plano","badItems":["Anota a carga no papel ou não anota nada","Esquece o que treinou e quanto levantou semana passada","Come \"no olho\", sem saber se bate a meta de proteína","Não sabe se está evoluindo de verdade"],"goodLabel":"Com EAFIT","goodItems":["Treino do dia pronto, com carga da última vez à vista","Cada série concluída fica registrada automaticamente","Cardápio com macros calculados pro seu objetivo","Gráficos, heatmap e PRs mostram sua evolução real"]},
{"id":"features","type":"features","enabled":true,"title":"Tudo que você precisa pra treinar sério","subtitle":"Sem planilha, sem app pago, sem depender de internet.","items":[{"icon":"activity","title":"Treino semanal","description":"Plano dividido por dia da semana, com séries, repetições, técnica e tempo de descanso por exercício."},{"icon":"droplet","title":"Dieta com macros","description":"Cardápio diário com kcal, proteína, carboidrato, gordura e água, personalizado pro seu objetivo."},{"icon":"chart","title":"Evolução e recordes","description":"Volume por treino, heatmap dos últimos 35 dias, evolução de carga por exercício e seus PRs."},{"icon":"user","title":"Perfil e IMC","description":"Dados corporais, cálculo de IMC, meta principal e estatísticas de frequência e sequência de treinos."},{"icon":"cloud","title":"Sync em nuvem","description":"Login por e-mail e dados sincronizados entre celular, tablet e computador automaticamente."},{"icon":"download","title":"Instalável e offline","description":"Funciona como app instalável no celular, com cache local e sem precisar de internet o tempo todo."}]},
{"id":"steps","type":"steps","enabled":true,"title":"Como funciona","subtitle":"Leva menos de 2 minutos pra começar.","items":[{"title":"Crie sua conta","description":"Cadastro rápido por e-mail, sem burocracia."},{"title":"Onboarding personalizado","description":"Informe peso, altura e objetivo — o app monta seu treino e cardápio."},{"title":"Acompanhe todo dia","description":"Registre suas séries, sua dieta e veja sua evolução crescer."}]},
{"id":"cta","type":"cta","enabled":true,"title":"Pronto pra começar a treinar sério?","subtitle":"Grátis, sem anúncios, funciona offline.","ctaLabel":"Abrir o EAFIT"}
]}
$land$::jsonb) on conflict (id) do nothing;
