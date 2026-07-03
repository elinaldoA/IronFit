// Edge Function que roda a cada minuto (via pg_cron) e envia notificações Web
// Push para os usuários inscritos, mesmo com o app/navegador fechado. Espelha a
// lógica de horários de refeição/água que hoje roda só no navegador
// (app-react/src/components/ReminderScheduler.jsx), mas consultando o estado
// real salvo no banco (diet_logs / water_logs) em vez de localStorage.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:contato@ironfit.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const WATER_REMINDER_TIMES = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
const DEFAULT_MACRO_AGUA = 3.5;

// Mesma tabela padrão de app-react/src/data/treinoData.js (dietaData) — se o
// usuário tiver customMeals em user_metadata, essas prevalecem.
const DEFAULT_MEALS = [
  { horario: '07:30', nome: '☀️ Café da manhã', descricao: '4 ovos inteiros + 3 claras (mexidos) · 40g aveia · 1 banana · 1 col. mel · Café preto' },
  { horario: '10:30', nome: '🍏 Lanche da manhã', descricao: '1 scoop Whey (ou 180g iogurte grego) · 1 maçã · 25g amêndoas' },
  { horario: '13:00', nome: '🥗 Almoço', descricao: '220g frango grelhado · 250g arroz integral ou batata-doce · 200g brócolis · 1 col. azeite' },
  { horario: '17:30', nome: '⚡ Pré-treino pesado', descricao: '200g peito de peru/atum · 2 pães integrais · 1 batata-doce média (150g) · 1 banana · 500ml água' },
  { horario: '19:30', nome: '☕ Pré-treino leve', descricao: 'Café preto (sem açúcar) · 1 scoop Whey (opcional)' },
  { horario: '20:00', nome: '🏋️ Treino', descricao: 'Beba 500ml a 1L de água durante o treino' },
  { horario: '21:15', nome: '🍽️ Pós-treino / Jantar', descricao: '200g peixe (salmão/tilápia) ou contra-filé · 250g arroz branco · Salada verde com azeite' },
  { horario: '23:30', nome: '🥛 Ceia (opcional)', descricao: 'Se bater fome: 2 ovos cozidos ou 1 scoop caseína com água' },
];

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, '');
}

// Horário de Brasília, igual ao que o navegador do usuário usa (new Date()
// local) — o cron do Postgres roda em UTC, então convertemos explicitamente.
function nowInSaoPaulo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find(p => p.type === type)?.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

Deno.serve(async () => {
  const { date, time } = nowInSaoPaulo();

  const { data: subs, error: subsErr } = await supabase.from('push_subscriptions').select('*');
  if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  let sent = 0;

  // Um único fetch paginado de todos os usuários em vez de uma chamada admin
  // por usuário por minuto (evita rate limit do GoTrue com mais usuários).
  const metaById = new Map();
  for (let page = 1; ; page++) {
    const { data: usersPage, error: usersErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (usersErr) return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 });
    for (const u of usersPage.users) metaById.set(u.id, u.user_metadata || {});
    if (usersPage.users.length < 1000) break;
  }

  for (const userId of userIds) {
    const meta = metaById.get(userId) || {};
    const meals = Array.isArray(meta.customMeals) && meta.customMeals.length > 0 ? meta.customMeals : DEFAULT_MEALS;
    const macroAgua = Number(meta.macroAgua) > 0 ? Number(meta.macroAgua) : DEFAULT_MACRO_AGUA;
    const userSubs = subs.filter((s) => s.user_id === userId);

    const payloads = [];

    const dueMeal = meals.find((m) => m.horario === time);
    if (dueMeal) {
      const { data: log } = await supabase
        .from('diet_logs')
        .select('completed')
        .eq('user_id', userId).eq('log_date', date).eq('meal_name', dueMeal.nome)
        .maybeSingle();
      if (!log?.completed) {
        payloads.push({ title: `⏰ ${dueMeal.nome}`, body: stripHtml(dueMeal.descricao), tag: `meal-${date}-${dueMeal.nome}` });
      }
    }

    if (WATER_REMINDER_TIMES.includes(time)) {
      const { data: waterLog } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', userId).eq('log_date', date)
        .maybeSingle();
      const currentMl = waterLog?.amount_ml || 0;
      const goalMl = macroAgua * 1000;
      if (currentMl < goalMl) {
        payloads.push({
          title: '💧 Hora de beber água',
          body: `Você bebeu ${(currentMl / 1000).toFixed(1)}L de ${(goalMl / 1000).toFixed(1)}L hoje.`,
          tag: `water-${date}-${time}`,
        });
      }
    }

    for (const payload of payloads) {
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: payload.title, body: payload.body, tag: payload.tag, url: '/IronFit/' })
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          } else {
            console.error('sendNotification error:', err);
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
