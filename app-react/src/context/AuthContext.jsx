import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    db.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? session.user : null);
      setAuthLoading(false);
    });
  }, []);

  async function login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha inválidos.' };
    setUser(data.user);
    return {};
  }

  async function signup(email, password) {
    if (password.length < 6) return { error: 'Senha: mínimo 6 caracteres.' };
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      setUser(data.user);
      return {};
    }
    return { success: 'Conta criada! Verifique seu e-mail para ativar.' };
  }

  async function logout() {
    await db.auth.signOut();
    setUser(null);
  }

  async function updateProfile(fields) {
    const { data, error } = await db.auth.updateUser({ data: fields });
    if (!error && data?.user) setUser(data.user);
    return { error };
  }

  async function updateEmail(email) {
    const { error } = await db.auth.updateUser({ email });
    return { error: error?.message };
  }

  async function updatePassword(password) {
    if (password.length < 6) return { error: 'Senha: mínimo 6 caracteres.' };
    const { error } = await db.auth.updateUser({ password });
    return { error: error?.message };
  }

  async function deleteAccount() {
    if (!user) return { error: 'Não autenticado.' };
    const { error } = await db.functions.invoke('delete-account');
    if (error) return { error: error.message };
    await db.auth.signOut();
    setUser(null);
    return {};
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, signup, logout, updateProfile, updateEmail, updatePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
