import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/supabase';

const AdminAuthContext = createContext(null);

// Só existe um papel aqui: super admin. O login usa o mesmo Supabase Auth do
// app do aluno — a diferença é que, depois de autenticar, checamos
// profiles.is_admin (liberado pela própria policy "vê seu próprio perfil")
// e derrubamos a sessão na hora se não for admin. Isso é só UX: a proteção
// de verdade é a policy "admin full access" (is_admin()) no banco e o check
// server-side na edge function admin-users.
export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function resolveSession(session) {
      if (!session) {
        if (active) setAdminUser(null);
        return;
      }
      const isAdmin = await checkIsAdmin(session.user.id);
      if (!active) return;
      if (isAdmin) {
        setAdminUser(session.user);
      } else {
        setAdminUser(null);
        await db.auth.signOut();
      }
    }

    db.auth.getSession()
      .then(({ data: { session } }) => resolveSession(session))
      .catch(err => console.error('getSession:', err))
      .finally(() => { if (active) setAuthLoading(false); });

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      resolveSession(session).finally(() => { if (active) setAuthLoading(false); });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function checkIsAdmin(userId) {
    const { data, error } = await db.from('profiles').select('is_admin').eq('id', userId).single();
    return !error && data?.is_admin === true;
  }

  async function login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha inválidos.' };

    const isAdmin = await checkIsAdmin(data.user.id);
    if (!isAdmin) {
      await db.auth.signOut();
      return { error: 'Esta conta não tem acesso ao backoffice.' };
    }

    setAdminUser(data.user);
    return {};
  }

  async function logout() {
    await db.auth.signOut();
    setAdminUser(null);
  }

  async function updateProfile(fields) {
    const { data, error } = await db.auth.updateUser({ data: fields });
    if (!error && data?.user) setAdminUser(data.user);
    return { error: error?.message };
  }

  async function updatePassword(password) {
    if (password.length < 6) return { error: 'Senha: mínimo 6 caracteres.' };
    const { error } = await db.auth.updateUser({ password });
    return { error: error?.message };
  }

  return (
    <AdminAuthContext.Provider value={{ adminUser, authLoading, login, logout, updateProfile, updatePassword }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
