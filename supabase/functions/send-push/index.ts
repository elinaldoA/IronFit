// Edge Function de push imediato, chamada pelo próprio app (client) logo após um
// evento acontecer (novo PR, conquista desbloqueada) — ao contrário de send-reminders
// (chamada só pelo cron, sem usuário logado), esta precisa de autenticação: o usuário
// só pode mandar push pra si mesmo, nunca pra outro. Por isso Verify JWT fica LIGADO
// no dashboard e o user_id vem do token, nunca do body da requisição.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:contato@eafit.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  // Cliente com o token do próprio usuário (não a service role) só pra validar quem
  // está chamando — getUser() verifica a assinatura/expiração do JWT contra o Auth.
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
  if (authErr || !user) return new Response('Unauthorized', { status: 401 });

  const { title, body, tag } = await req.json().catch(() => ({}));
  if (!title || !body) {
    return new Response(JSON.stringify({ error: 'title e body são obrigatórios' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: subs, error: subsErr } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id);
  if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 });

  let sent = 0;
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, tag, url: '/EAFIT/' })
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      } else {
        console.error('sendNotification error:', err);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
