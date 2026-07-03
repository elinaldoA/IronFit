import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    // keepalive: uma request já em voo (ex.: save disparado bem antes de um
    // reload/fechar de aba) continua e completa mesmo depois da página descarregar.
    global: {
      fetch: (url, options = {}) => fetch(url, { ...options, keepalive: true }),
    },
  }
);
