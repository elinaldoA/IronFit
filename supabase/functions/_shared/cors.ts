// Cabeçalhos CORS pras edge functions chamadas pelo app-admin (browser) via
// supabase-js .functions.invoke(). Sem isso, o preflight OPTIONS que o
// navegador manda antes do POST (por causa do header Authorization
// customizado) cai na própria função, que respondia 405 sem
// Access-Control-Allow-Origin — o navegador bloqueia o POST real e
// supabase-js reporta só "Failed to send a request to the Edge Function",
// sem detalhe nenhum do erro de verdade.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
