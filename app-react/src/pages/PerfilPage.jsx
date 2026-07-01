import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getWeekStart, calcStreak } from '../lib/utils';

function imcInfo(peso, altura) {
  if (!peso || !altura || peso < 30 || altura < 100) return null;
  const imc = peso / ((altura / 100) ** 2);
  const cls =
    imc < 18.5 ? 'Abaixo do peso' :
    imc < 25 ? 'Peso normal' :
    imc < 30 ? 'Sobrepeso' :
    imc < 35 ? 'Obesidade grau I' : 'Obesidade grau II+';
  return { value: imc.toFixed(1), cls };
}

export default function PerfilPage({ active }) {
  const { user, logout, updateProfile } = useAuth();
  const toast = useToast();

  const md = user?.user_metadata || {};
  const [peso, setPeso] = useState(md.peso || localStorage.getItem('profile_peso') || '');
  const [altura, setAltura] = useState(md.altura || localStorage.getItem('profile_altura') || '');
  const [meta, setMeta] = useState(md.meta || localStorage.getItem('profile_meta') || 'massa');
  const [stats, setStats] = useState({ total: '–', week: '–', streak: '–' });

  useEffect(() => {
    if (!active || !user) return;

    async function loadStats() {
      try {
        const { data: workouts, error } = await db
          .from('workouts')
          .select('workout_date')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('workout_date', { ascending: false });
        if (error) throw error;

        const total = workouts.length;
        const wStart = getWeekStart();
        const week = workouts.filter(w => w.workout_date >= wStart).length;
        const streak = calcStreak(workouts.map(w => w.workout_date));

        setStats({ total, week: `${week}/5`, streak: streak > 0 ? `${streak}d` : '0d' });
      } catch (err) {
        console.error('loadProfileStats:', err);
      }
    }
    loadStats();
  }, [active, user]);

  async function handleSave() {
    localStorage.setItem('profile_peso', peso);
    localStorage.setItem('profile_altura', altura);
    localStorage.setItem('profile_meta', meta);
    await updateProfile({ peso, altura, meta });
    toast('Perfil salvo!');
  }

  const since = user ? new Date(user.created_at) : null;
  const imc = imcInfo(parseFloat(peso), parseFloat(altura));

  return (
    <section id="page-perfil" className="page active">
      <div className="profile-hero">
        <div className="profile-avatar">{user?.email?.[0]?.toUpperCase() || '?'}</div>
        <div className="profile-hero__info">
          <div className="profile-email">{user?.email || '–'}</div>
          <div className="profile-since">
            {since ? 'Membro desde ' + since.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '–'}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__value">{stats.week}</span>
          <span className="stat-card__label">Esta semana</span>
        </div>
        <div className="stat-card stat-card--streak">
          <span className="stat-card__value">{stats.streak}</span>
          <span className="stat-card__label">Sequência 🔥</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{stats.total}</span>
          <span className="stat-card__label">Total treinos</span>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section__title">Meu Corpo</div>
        <div className="profile-section__fields">
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="profilePeso">Peso (kg)</label>
            <input
              type="number" id="profilePeso" className="input input--sm" placeholder="Ex: 85"
              min="30" max="300" step="0.1" value={peso} onChange={e => setPeso(e.target.value)}
            />
          </div>
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="profileAltura">Altura (cm)</label>
            <input
              type="number" id="profileAltura" className="input input--sm" placeholder="Ex: 178"
              min="100" max="250" value={altura} onChange={e => setAltura(e.target.value)}
            />
          </div>
        </div>
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="profileMeta">Meta principal</label>
          <select id="profileMeta" className="input input--sm" value={meta} onChange={e => setMeta(e.target.value)}>
            <option value="massa">Ganho de massa</option>
            <option value="forca">Aumento de força</option>
            <option value="emagrecer">Emagrecimento</option>
            <option value="definicao">Definição muscular</option>
            <option value="saude">Saúde e bem-estar</option>
          </select>
        </div>
        {imc && (
          <div className="imc-card">
            <span className="imc-card__label">IMC</span>
            <span className="imc-card__value">{imc.value}</span>
            <span className="imc-card__class">{imc.cls}</span>
          </div>
        )}
        <button className="btn btn--primary btn--full" onClick={handleSave}>Salvar dados corporais</button>
      </div>

      <button className="btn btn--outline btn--full" onClick={logout}>Sair da conta</button>
    </section>
  );
}
