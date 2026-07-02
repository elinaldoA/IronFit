import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAvatar } from '../context/AvatarContext';
import { useWorkout } from '../context/WorkoutContext';
import { enqueue } from '../lib/syncQueue';
import { getWeekStart, calcStreak, fmtDate, getDisplayName } from '../lib/utils';
import { TODAY_DATE } from '../data/treinoData';
import { fetchWeightLogs, upsertWeightLog } from '../lib/weightLog';
import { saveAvatar } from '../lib/avatar';
import { DEFAULT_MACROS, DEFAULT_WEEKLY_GOAL } from '../data/treinoData';
import { isNotificationSupported, sendNotification } from '../lib/notifications';
import { useReminders } from '../hooks/useReminders';
import { exportSummaryCSV, exportBackupJSON, printReport } from '../lib/exportData';
import { shareProgress } from '../lib/shareCard';
import LineChart from '../components/LineChart';

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

function metaProgress(pesoAtual, pesoAlvo, weightLogs) {
  if (!pesoAtual || !pesoAlvo) return null;
  const diff = pesoAtual - pesoAlvo;
  if (Math.abs(diff) < 0.1) return { done: true, msg: '🎉 Meta de peso alcançada!' };

  const first = weightLogs[0]?.peso ?? pesoAtual;
  const totalSpan = Math.abs(first - pesoAlvo) || 1;
  const covered = Math.abs(first - pesoAtual);
  const pct = Math.max(0, Math.min(100, (covered / totalSpan) * 100));
  const msg = `Faltam ${Math.abs(diff).toFixed(1)}kg para a meta de ${pesoAlvo}kg`;
  return { done: false, pct, msg };
}

export default function PerfilPage({ active }) {
  const { user, logout, updateProfile, updateEmail, updatePassword, deleteAccount } = useAuth();
  const toast = useToast();
  const { markPending } = useWorkout();

  const md = user?.user_metadata || {};
  const [nome, setNome] = useState(md.nome || localStorage.getItem('profile_nome') || '');
  const [sobrenome, setSobrenome] = useState(md.sobrenome || localStorage.getItem('profile_sobrenome') || '');
  const [apelido, setApelido] = useState(md.apelido || localStorage.getItem('profile_apelido') || '');
  const [peso, setPeso] = useState(md.peso || localStorage.getItem('profile_peso') || '');
  const [altura, setAltura] = useState(md.altura || localStorage.getItem('profile_altura') || '');
  const [meta, setMeta] = useState(md.meta || localStorage.getItem('profile_meta') || 'massa');
  const [pesoAlvo, setPesoAlvo] = useState(md.pesoAlvo || localStorage.getItem('profile_pesoAlvo') || '');
  const [macroKcal, setMacroKcal] = useState(md.macroKcal || localStorage.getItem('profile_macroKcal') || '');
  const [macroProteina, setMacroProteina] = useState(md.macroProteina || localStorage.getItem('profile_macroProteina') || '');
  const [macroCarboidrato, setMacroCarboidrato] = useState(md.macroCarboidrato || localStorage.getItem('profile_macroCarboidrato') || '');
  const [macroGordura, setMacroGordura] = useState(md.macroGordura || localStorage.getItem('profile_macroGordura') || '');
  const [macroAgua, setMacroAgua] = useState(md.macroAgua || localStorage.getItem('profile_macroAgua') || '');
  const [weeklyGoal, setWeeklyGoal] = useState(md.weeklyGoal || localStorage.getItem('profile_weeklyGoal') || DEFAULT_WEEKLY_GOAL);
  const [stats, setStats] = useState({ total: '–', week: '–', streak: '–' });
  const [trainingTotals, setTrainingTotals] = useState({ volumeKg: 0, hours: 0 });
  const [volumeSeries, setVolumeSeries] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const { avatarData, setAvatarData } = useAvatar();
  const [remindersEnabled, toggleReminders] = useReminders(toast, user);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function handleExport(action, label) {
    if (!user || exporting) return;
    setExporting(true);
    try {
      await action(user.id);
    } catch (err) {
      console.error('export:', err);
      toast(`⚠️ Erro ao gerar ${label}`);
    } finally {
      setExporting(false);
    }
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareProgress({
        nome: getDisplayName(user),
        streak: parseInt(stats.streak, 10) || 0,
        treinosSemana: typeof stats.week === 'number' ? stats.week : 0,
        weeklyGoal: weeklyGoalNum,
        totalTreinos: typeof stats.total === 'number' ? stats.total : 0,
        volumeKg: trainingTotals.volumeKg,
        horas: trainingTotals.hours,
        pesoSeries: weightLogs.slice(-10).map(w => w.peso),
        volumeSeries: volumeSeries.slice(-10).map(v => v.kg),
      });
      if (result === 'downloaded') toast('🖼️ Imagem baixada');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('shareProgress:', err);
        toast('⚠️ Erro ao gerar imagem de compartilhamento');
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await saveAvatar(user.id, file);
      setAvatarData(dataUrl);
      toast('✅ Foto de perfil atualizada');
    } catch (err) {
      toast(`⚠️ ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    if (!active || !user) return;

    async function loadProfileData() {
      try {
        const [{ data: workouts, error }, weights] = await Promise.all([
          db.from('workouts').select('id, workout_date, duration_seconds').eq('user_id', user.id).eq('completed', true).order('workout_date', { ascending: false }),
          fetchWeightLogs(user.id),
        ]);
        if (error) throw error;
        setWeightLogs(weights);

        const total = workouts.length;
        const wStart = getWeekStart();
        const week = workouts.filter(w => w.workout_date >= wStart).length;
        const streak = calcStreak(workouts.map(w => w.workout_date));

        setStats({ total, week, streak: streak > 0 ? `${streak}d` : '0d' });

        const totalSeconds = workouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0);
        const workoutIds = workouts.map(w => w.id);
        let volumeKg = 0;
        if (workoutIds.length) {
          const { data: sets, error: setsErr } = await db
            .from('exercise_sets')
            .select('carga, workout_id')
            .in('workout_id', workoutIds)
            .eq('completed', true)
            .not('carga', 'is', null);
          if (setsErr) throw setsErr;

          const dateByWorkout = Object.fromEntries(workouts.map(w => [w.id, w.workout_date]));
          const totalsByDate = {};
          (sets || []).forEach(s => {
            const carga = parseFloat(s.carga) || 0;
            volumeKg += carga;
            const date = dateByWorkout[s.workout_id];
            totalsByDate[date] = (totalsByDate[date] || 0) + carga;
          });
          setVolumeSeries(Object.keys(totalsByDate).sort().map(date => ({ date, kg: Math.round(totalsByDate[date]) })));
        } else {
          setVolumeSeries([]);
        }
        setTrainingTotals({ volumeKg: Math.round(volumeKg), hours: Math.round((totalSeconds / 3600) * 10) / 10 });
      } catch (err) {
        console.error('loadProfileStats:', err);
        toast('⚠️ Erro ao carregar estatísticas');
      }
    }

    loadProfileData();
  }, [active, user, toast]);

  async function handleSavePersonal() {
    localStorage.setItem('profile_nome', nome);
    localStorage.setItem('profile_sobrenome', sobrenome);
    localStorage.setItem('profile_apelido', apelido);
    await updateProfile({ nome, sobrenome, apelido });
    toast('✅ Dados pessoais salvos!');
  }

  async function handleSave() {
    localStorage.setItem('profile_peso', peso);
    localStorage.setItem('profile_altura', altura);
    localStorage.setItem('profile_meta', meta);
    localStorage.setItem('profile_pesoAlvo', pesoAlvo);
    await updateProfile({ peso, altura, meta, pesoAlvo });

    if (user && peso) {
      try {
        await upsertWeightLog(user.id, TODAY_DATE, parseFloat(peso));
        setWeightLogs(await fetchWeightLogs(user.id));
      } catch (err) {
        console.error('upsertWeightLog:', err);
        enqueue('weight_log', { userId: user.id, date: TODAY_DATE, peso: parseFloat(peso) });
        markPending();
      }
    }
    toast('Perfil salvo!');
  }

  async function handleSaveWeeklyGoal() {
    localStorage.setItem('profile_weeklyGoal', weeklyGoal);
    await updateProfile({ weeklyGoal });
    toast('📅 Meta semanal salva!');
  }

  async function handleSaveMacros() {
    localStorage.setItem('profile_macroKcal', macroKcal);
    localStorage.setItem('profile_macroProteina', macroProteina);
    localStorage.setItem('profile_macroCarboidrato', macroCarboidrato);
    localStorage.setItem('profile_macroGordura', macroGordura);
    localStorage.setItem('profile_macroAgua', macroAgua);
    await updateProfile({ macroKcal, macroProteina, macroCarboidrato, macroGordura, macroAgua });
    toast('🎯 Metas de macros salvas!');
  }

  async function handleUpdateEmail() {
    if (!newEmail) return;
    const { error } = await updateEmail(newEmail);
    if (error) return toast(`⚠️ ${error}`);
    toast('✅ Confirme o e-mail enviado para a nova conta');
    setNewEmail('');
  }

  async function handleUpdatePassword() {
    if (!newPassword) return;
    const { error } = await updatePassword(newPassword);
    if (error) return toast(`⚠️ ${error}`);
    toast('✅ Senha atualizada');
    setNewPassword('');
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Isso apaga seus treinos e dados salvos e encerra a sessão. Continuar?')) return;
    const { error } = await deleteAccount();
    if (error) toast(`⚠️ ${error}`);
  }

  const weeklyGoalNum = parseInt(weeklyGoal, 10) || DEFAULT_WEEKLY_GOAL;
  const since = user ? new Date(user.created_at) : null;
  const imc = imcInfo(parseFloat(peso), parseFloat(altura));
  const progress = useMemo(
    () => metaProgress(parseFloat(peso), parseFloat(pesoAlvo), weightLogs),
    [peso, pesoAlvo, weightLogs]
  );
  const weightPoints = useMemo(
    () => weightLogs.map(w => ({ label: fmtDate(w.log_date), value: w.peso })),
    [weightLogs]
  );

  return (
    <section id="page-perfil" className="page active">
      <div className="profile-hero">
        <label className={`profile-avatar${avatarData ? ' profile-avatar--photo' : ''}`}>
          {avatarData
            ? <img src={avatarData} alt="Foto de perfil" className="profile-avatar__img" />
            : (user?.email?.[0]?.toUpperCase() || '?')}
          <span className="profile-avatar__edit">{uploadingAvatar ? '…' : '📷'}</span>
          <input type="file" accept="image/*" hidden disabled={uploadingAvatar} onChange={handleAvatarChange} />
        </label>
        <div className="profile-hero__info">
          <div className="profile-email">{getDisplayName(user) || '–'}</div>
          {user?.email && user.email !== getDisplayName(user) && (
            <div className="profile-handle">{user.email}</div>
          )}
          <div className="profile-since">
            {since ? 'Membro desde ' + since.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '–'}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__value">
            {typeof stats.week === 'number' ? `${stats.week}/${weeklyGoalNum}` : stats.week}
          </span>
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

      <button type="button" className="btn btn--outline btn--full" disabled={sharing} onClick={handleShare}>
        {sharing ? 'Gerando imagem…' : '📤 Compartilhar progresso'}
      </button>

      <div className="section-group">
        <div className="section-group__label">Meus dados</div>

        <div className="profile-section">
          <div className="profile-section__title">Dados pessoais</div>
          <div className="profile-section__fields">
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="profileNome">Nome</label>
              <input
                type="text" id="profileNome" className="input input--sm" placeholder="Ex: João"
                value={nome} onChange={e => setNome(e.target.value)}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="profileSobrenome">Sobrenome</label>
              <input
                type="text" id="profileSobrenome" className="input input--sm" placeholder="Ex: Silva"
                value={sobrenome} onChange={e => setSobrenome(e.target.value)}
              />
            </div>
          </div>
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="profileApelido">Apelido</label>
            <input
              type="text" id="profileApelido" className="input input--sm" placeholder="Como prefere ser chamado"
              value={apelido} onChange={e => setApelido(e.target.value)}
            />
          </div>
          <button className="btn btn--primary btn--full" onClick={handleSavePersonal}>Salvar dados pessoais</button>
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
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="profilePesoAlvo">Peso alvo (kg)</label>
            <input
              type="number" id="profilePesoAlvo" className="input input--sm" placeholder="Ex: 80"
              min="30" max="300" step="0.1" value={pesoAlvo} onChange={e => setPesoAlvo(e.target.value)}
            />
          </div>
          {progress && (
            <div className="progress-card">
              <div className="progress-card__row">
                <span className="progress-card__label">{progress.msg}</span>
              </div>
              {!progress.done && (
                <div className="progress-card__bar">
                  <div className="progress-card__fill" style={{ width: `${progress.pct}%` }} />
                </div>
              )}
            </div>
          )}
          {imc && (
            <div className="imc-card">
              <span className="imc-card__label">IMC</span>
              <span className="imc-card__value">{imc.value}</span>
              <span className="imc-card__class">{imc.cls}</span>
            </div>
          )}
          <button className="btn btn--primary btn--full" onClick={handleSave}>Salvar dados corporais</button>
        </div>

        <div className="profile-section">
          <div className="profile-section__title">Meta Semanal de Treinos</div>
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="weeklyGoal">Treinos por semana</label>
            <input
              type="number" id="weeklyGoal" className="input input--sm" placeholder={String(DEFAULT_WEEKLY_GOAL)}
              min="1" max="7" step="1" value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)}
            />
          </div>
          <button className="btn btn--primary btn--full" onClick={handleSaveWeeklyGoal}>Salvar meta semanal</button>
        </div>

        <div className="profile-section">
          <div className="profile-section__title">Metas de Macros</div>
          <div className="profile-section__fields">
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="macroKcal">Kcal</label>
              <input
                type="number" id="macroKcal" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroKcal)}
                min="0" step="10" value={macroKcal} onChange={e => setMacroKcal(e.target.value)}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="macroProteina">Proteína (g)</label>
              <input
                type="number" id="macroProteina" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroProteina)}
                min="0" step="5" value={macroProteina} onChange={e => setMacroProteina(e.target.value)}
              />
            </div>
          </div>
          <div className="profile-section__fields">
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="macroCarboidrato">Carboidrato (g)</label>
              <input
                type="number" id="macroCarboidrato" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroCarboidrato)}
                min="0" step="5" value={macroCarboidrato} onChange={e => setMacroCarboidrato(e.target.value)}
              />
            </div>
            <div className="profile-field">
              <label className="profile-field__label" htmlFor="macroGordura">Gordura (g)</label>
              <input
                type="number" id="macroGordura" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroGordura)}
                min="0" step="5" value={macroGordura} onChange={e => setMacroGordura(e.target.value)}
              />
            </div>
          </div>
          <div className="profile-field">
            <label className="profile-field__label" htmlFor="macroAgua">Meta de água (L)</label>
            <input
              type="number" id="macroAgua" className="input input--sm" placeholder={String(DEFAULT_MACROS.macroAgua)}
              min="0" step="0.5" value={macroAgua} onChange={e => setMacroAgua(e.target.value)}
            />
          </div>
          <button className="btn btn--primary btn--full" onClick={handleSaveMacros}>Salvar metas de macros</button>
        </div>
      </div>

      <div className="section-group">
        <div className="section-group__label">Progresso</div>

        <div className="profile-section">
          <div className="profile-section__title">Evolução do peso</div>
          <div className="line-chart-wrap">
            <LineChart
              points={weightPoints}
              valueSuffix="kg"
              singleMsg={v => `1 registro: ${v}kg — salve seu peso novamente em outro dia para ver a evolução`}
              emptyMsg="Nenhum peso registrado ainda. Salve seus dados corporais acima para começar."
            />
          </div>
        </div>
      </div>

      <div className="section-group">
        <div className="section-group__label">Preferências</div>

        <div className="profile-section">
          <div className="profile-section__title">Notificações</div>
          <div className="profile-field profile-field--row">
            <label className="profile-field__label" htmlFor="remindersToggle">
              Lembretes de refeição, treino e água (app aberto)
            </label>
            <input
              type="checkbox" id="remindersToggle"
              checked={remindersEnabled} onChange={toggleReminders}
              disabled={!isNotificationSupported()}
            />
          </div>
          {!isNotificationSupported() && (
            <p className="dash-empty">Notificações não são suportadas neste navegador.</p>
          )}
          <button
            className="btn btn--outline btn--sm"
            disabled={!isNotificationSupported()}
            onClick={() => sendNotification('🔔 Notificação de teste', { body: 'Se você está vendo isso, está tudo funcionando!' })
              .then(() => toast('✅ Notificação enviada'))
              .catch(err => toast(`❌ Falhou: ${err.message}`))}
          >Testar notificação</button>
        </div>

        <div className="profile-section">
          <div className="profile-section__title">Exportar e backup</div>
          <p className="dash-empty">Baixe seus dados a qualquer momento — nenhuma biblioteca externa é usada, tudo é gerado no seu navegador.</p>
          <div className="export-actions">
            <button className="btn btn--outline btn--sm" disabled={exporting} onClick={() => handleExport(exportSummaryCSV, 'o resumo (CSV)')}>📊 Resumo (CSV)</button>
            <button className="btn btn--outline btn--sm" disabled={exporting} onClick={() => handleExport(exportBackupJSON, 'o backup (JSON)')}>💾 Backup completo (JSON)</button>
            <button className="btn btn--outline btn--sm" disabled={exporting} onClick={() => handleExport(printReport, 'o relatório')}>🖨️ Relatório para imprimir</button>
          </div>
        </div>
      </div>

      <div className="section-group">
        <div className="section-group__label">Conta</div>

        <div className="profile-section">
          <button
            type="button"
            className="profile-section__title"
            onClick={() => setAccountOpen(o => !o)}
          >
            Alterar e-mail / senha {accountOpen ? '▲' : '▼'}
          </button>
          {accountOpen && (
            <>
              <div className="profile-field">
                <label className="profile-field__label" htmlFor="newEmail">Novo e-mail</label>
                <input
                  type="email" id="newEmail" className="input input--sm" placeholder={user?.email}
                  value={newEmail} onChange={e => setNewEmail(e.target.value)}
                />
                <button className="btn btn--outline btn--sm" onClick={handleUpdateEmail}>Atualizar e-mail</button>
              </div>
              <div className="profile-field">
                <label className="profile-field__label" htmlFor="newPassword">Nova senha</label>
                <input
                  type="password" id="newPassword" className="input input--sm" placeholder="Mínimo 6 caracteres"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                />
                <button className="btn btn--outline btn--sm" onClick={handleUpdatePassword}>Atualizar senha</button>
              </div>
            </>
          )}
        </div>

        <button className="btn btn--outline btn--full" onClick={logout}>Sair da conta</button>
        <button className="btn btn--ghost btn--full" onClick={handleDeleteAccount}>Excluir conta</button>
      </div>
    </section>
  );
}
