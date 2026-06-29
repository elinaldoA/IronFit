/* ============================================================
   CONFIG — Supabase
============================================================ */
const SUPABASE_URL      = 'https://btzdetvoneyhzthsmdrp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NJWhkVt39gqzkAcmvmhw_g_9coJjxnb';

// supabase-js v2 CDN exposes global `supabase`
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   CONSTANTS
============================================================ */
const DAY_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const TODAY_NAME = DAY_NAMES[new Date().getDay()];
const TODAY_DATE = new Date().toISOString().split('T')[0];

/* ============================================================
   DATA — Treino
============================================================ */
const treinoData = [
    { dia:'Segunda', foco:'Peito / Ombro / Tríceps', exercicios:[
        { nome:'Supino Reto com Barra',          series:'4', reps:'8-10',  descanso:'90s', tecnica:'Cadência 2-0-2' },
        { nome:'Supino Inclinado com Halteres',  series:'3', reps:'10-12', descanso:'60s', tecnica:'Alongamento máximo' },
        { nome:'Crucifixo Máquina',              series:'3', reps:'12-15', descanso:'45s', tecnica:'Pico de contração' },
        { nome:'Desenvolvimento com Barra',      series:'4', reps:'8-10',  descanso:'90s', tecnica:'Lombar apoiada' },
        { nome:'Elevação Lateral com Halteres',  series:'4', reps:'12-15', descanso:'45s', tecnica:'Leve inclinação' },
        { nome:'Tríceps Corda na Polia',         series:'3', reps:'12-15', descanso:'45s', tecnica:'Full ROM' },
        { nome:'Tríceps Testa com Barra W',      series:'3', reps:'10-12', descanso:'60s', tecnica:'Cotovelos fixos' },
    ], pos:[
        { nome:'🏃 Cardio — Esteira Inclinada',          detalhe:'20min · 10% inclinação / 5km/h' },
        { nome:'🔷 Abdominal Polia (Corda)',              detalhe:'4×12-15 · Pico de contração' },
        { nome:'🔷 Elevação de Pernas Pendurado',        detalhe:'3× falha (máx 20) · Máximo alongamento' },
        { nome:'🔷 Prancha com Peso',                    detalhe:'3×45s · Isometria com carga' },
    ]},
    { dia:'Terça', foco:'Costas / Bíceps', exercicios:[
        { nome:'Puxada Aberta Frente',           series:'4', reps:'8-10',  descanso:'90s', tecnica:'Tronco inclinado' },
        { nome:'Remada Curvada com Barra',       series:'4', reps:'8-10',  descanso:'90s', tecnica:'Escápula ativa' },
        { nome:'Remada Unilateral com Halter',   series:'3', reps:'10-12', descanso:'60s', tecnica:'Máximo alongamento' },
        { nome:'Pulldown Neutro (Triângulo)',     series:'3', reps:'10-12', descanso:'60s', tecnica:'Cotovelo guiado' },
        { nome:'Face Pull',                      series:'4', reps:'15-20', descanso:'45s', tecnica:'Essencial postura' },
        { nome:'Rosca Direta Barra W',           series:'3', reps:'10-12', descanso:'60s', tecnica:'Sem balanço' },
        { nome:'Rosca Martelo Alternada',        series:'3', reps:'12-15', descanso:'45s', tecnica:'Supinação no pico' },
        { nome:'Rosca Inversa com Barra',        series:'2', reps:'12-15', descanso:'45s', tecnica:'Foco antebraço' },
    ], pos:[
        { nome:'🏃 Cardio — Escada',                     detalhe:'20min · Moderado (130bpm)' },
        { nome:'🔷 Abdominal Supra com Halter',          detalhe:'3×15-20 · Carga moderada' },
        { nome:'🔷 Bicicleta no Solo',                   detalhe:'3×20 cada perna · Movimento alternado' },
        { nome:'🔷 Prancha Lateral com Elevação',        detalhe:'3×30s cada lado · Estabilidade dinâmica' },
    ]},
    { dia:'Quarta', foco:'Pernas / Quadríceps', exercicios:[
        { nome:'Agachamento Livre',              series:'4', reps:'6-8',   descanso:'2min', tecnica:'Profundo (paralelo)' },
        { nome:'Leg Press 45°',                  series:'4', reps:'10-12', descanso:'75s',  tecnica:'Amplitude máxima' },
        { nome:'Cadeira Extensora',              series:'4', reps:'12-15', descanso:'45s',  tecnica:'Pausa 2s no pico' },
        { nome:'Afundo Búlgaro',                 series:'3', reps:'10-12', descanso:'60s',  tecnica:'Pé elevado atrás' },
        { nome:'Agachamento Sumô com Halter',    series:'3', reps:'12-15', descanso:'45s',  tecnica:'Foco adutores' },
        { nome:'Panturrilha em Pé',              series:'4', reps:'12-15', descanso:'45s',  tecnica:'2s de estiramento' },
        { nome:'Panturrilha Sentado',            series:'3', reps:'15-20', descanso:'45s',  tecnica:'Pico de contração' },
    ], pos:[
        { nome:'🏃 Cardio — Caminhada Leve',             detalhe:'10min · Resfriamento' },
        { nome:'🔷 Crunch Invertido (banco)',             detalhe:'4×15 · Levanta quadril' },
        { nome:'🔷 Russian Twist com Halter',            detalhe:'3×20 cada lado · Rotação tronco' },
        { nome:'🔷 Prancha Frontal Estática',            detalhe:'3×60s · Isometria máxima' },
    ]},
    { dia:'Quinta', foco:'Superiores / Força', exercicios:[
        { nome:'Supino Reto com Halteres',       series:'4', reps:'6-8',   descanso:'2min', tecnica:'Carga alta (força)' },
        { nome:'Remada com Barra T',             series:'4', reps:'8-10',  descanso:'90s',  tecnica:'Contração escapular' },
        { nome:'Desenvolvimento Arnold',         series:'3', reps:'8-10',  descanso:'75s',  tecnica:'Rotação completa' },
        { nome:'Crucifixo Invertido',            series:'3', reps:'12-15', descanso:'45s',  tecnica:'Posterior ombro' },
        { nome:'Rosca Scott',                    series:'3', reps:'10-12', descanso:'60s',  tecnica:'Banco ajustado' },
        { nome:'Tríceps Francês com Halter',     series:'3', reps:'10-12', descanso:'60s',  tecnica:'Cotovelo estabilizado' },
        { nome:'Farmer Walk',                    series:'3', reps:'30s',   descanso:'60s',  tecnica:'Grip + Core' },
    ], pos:[
        { nome:'🏃 Cardio — Caminhada (6km/h)',          detalhe:'25min · Moderado' },
        { nome:'🔷 Abdominal na Máquina',                detalhe:'4×12-15 · Carga controlada' },
        { nome:'🔷 Tesoura (Scissor Kicks)',             detalhe:'3×20 cada perna · Alonga ísquios' },
        { nome:'🔷 Prancha com Braços Estendidos',       detalhe:'3×45s · Ativa peitoral e core' },
    ]},
    { dia:'Sexta', foco:'Posterior / Glúteos', exercicios:[
        { nome:'Romeno com Barra',               series:'4', reps:'8-10',  descanso:'90s', tecnica:'Estiramento máximo' },
        { nome:'Stiff com Halteres',             series:'3', reps:'10-12', descanso:'60s', tecnica:'Joelhos levemente flexionados' },
        { nome:'Cadeira Flexora (Deitado)',       series:'4', reps:'12-15', descanso:'45s', tecnica:'Pausa no pico' },
        { nome:'Mesa Flexora (Sentado)',          series:'3', reps:'12-15', descanso:'45s', tecnica:'Negativa lenta' },
        { nome:'Afundo Búlgaro (foco glúteo)',   series:'3', reps:'10-12', descanso:'60s', tecnica:'Tronco inclinado' },
        { nome:'Elevação Pélvica',               series:'3', reps:'15-20', descanso:'45s', tecnica:'Pausa 3s no topo' },
        { nome:'Panturrilha em Pé (carga)',      series:'4', reps:'10-12', descanso:'45s', tecnica:'Ênfase potência' },
    ], pos:[
        { nome:'🏃 Cardio — HIIT Esteira',               detalhe:'15min · 1min corre / 2min caminha' },
        { nome:'🔷 Roda (Ab Wheel)',                     detalhe:'4×10-12 · Extensão total core' },
        { nome:'🔷 Elevação de Pernas Deitado',          detalhe:'3×15-20 · Toque os pés' },
        { nome:'🔷 Prancha Lateral Estática',            detalhe:'3×45s cada lado · Estabilidade unilateral' },
    ]},
    { dia:'Sábado', foco:'Cardio Leve / Recuperação', exercicios:[
        { nome:'Caminhada Rápida ou Bicicleta', series:'-', reps:'30-40min', descanso:'-', tecnica:'5-6km/h ou 130bpm' },
    ], pos:[]},
    { dia:'Domingo', foco:'Descanso Total', exercicios:[
        { nome:'Sem treino', series:'-', reps:'-', descanso:'-', tecnica:'Recuperação ativa' },
    ], pos:[]},
];

const macroData = [
    { value:'2600',  label:'Kcal' },
    { value:'200g',  label:'Proteína' },
    { value:'290g',  label:'Carboidrato' },
    { value:'70g',   label:'Gordura' },
    { value:'3.5L',  label:'Água', isWater:true },
];

const dietaData = [
    { horario:'07:30', nome:'☀️ Café da manhã',          descricao:'4 ovos inteiros + 3 claras (mexidos) · 40g aveia · 1 banana · 1 col. mel · Café preto' },
    { horario:'10:30', nome:'🍏 Lanche da manhã',         descricao:'1 scoop Whey (ou 180g iogurte grego) · 1 maçã · 25g amêndoas' },
    { horario:'13:00', nome:'🥗 Almoço',                  descricao:'220g frango grelhado · 250g arroz integral ou batata-doce · 200g brócolis · 1 col. azeite' },
    { horario:'17:30', nome:'⚡ Pré-treino pesado',       descricao:'200g peito de peru/atum · 2 pães integrais · 1 batata-doce média (150g) · 1 banana · 500ml água' },
    { horario:'19:30', nome:'☕ Pré-treino leve',         descricao:'Café preto (sem açúcar) · 1 scoop Whey (opcional)' },
    { horario:'20:00', nome:'🏋️ Treino',                 descricao:'Beba <strong>500ml a 1L</strong> de água durante o treino' },
    { horario:'21:15', nome:'🍽️ Pós-treino / Jantar',    descricao:'200g peixe (salmão/tilápia) ou contra-filé · 250g arroz branco · Salada verde com azeite' },
    { horario:'23:30', nome:'🥛 Ceia (opcional)',         descricao:'Se bater fome: 2 ovos cozidos ou 1 scoop caseína com água' },
    { horario:'💧',    nome:'Hidratação obrigatória',     descricao:'<strong>3,5 a 4 litros</strong> ao longo do dia — peso elevado exige mais hídrico', isWater:true },
];

/* ============================================================
   STATE
============================================================ */
const state = {
    user:         null,
    workoutId:    null,
    saveTimers:   {},
};

/* ============================================================
   TOAST
============================================================ */
let _toastTimer = null;

function toast(msg, ms = 2600) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ============================================================
   AUTH
============================================================ */
async function checkSession() {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        state.user = session.user;
        onLoggedIn();
    } else {
        showAuthPanel();
    }
}

function showAuthPanel() {
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('weekProgress').style.display = 'none';
}

function hideAuthPanel() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('weekProgress').style.display = 'flex';
}

function renderUserChip() {
    document.getElementById('headerAuth').innerHTML = `
        <div class="user-chip">
            <span class="user-chip__email">${state.user.email}</span>
            <span class="sync-badge sync-badge--ok" id="syncBadge">✓ Sincronizado</span>
            <button class="btn btn--ghost btn--sm btn--icon" id="syncBtn" title="Sincronizar">↻</button>
            <button class="btn btn--ghost btn--sm" id="logoutBtn">Sair</button>
        </div>
    `;
    document.getElementById('syncBtn').addEventListener('click', syncNow);
    document.getElementById('logoutBtn').addEventListener('click', doLogout);
}

function setSyncBadge(status) {
    const el = document.getElementById('syncBadge');
    if (!el) return;
    const map = {
        ok:      ['✓ Sincronizado',   'sync-badge--ok'],
        loading: ['⏳ Sincronizando…', 'sync-badge--loading'],
        error:   ['⚠️ Erro de sync',   'sync-badge--error'],
    };
    const [text, cls] = map[status];
    el.textContent = text;
    el.className = `sync-badge ${cls}`;
}

async function onLoggedIn() {
    hideAuthPanel();
    renderUserChip();
    await loadUserData();
    updateWeekProgress();
}

async function doLogin() {
    const email = document.getElementById('emailInput').value.trim();
    const pwd   = document.getElementById('passwordInput').value;
    if (!email || !pwd) { setAuthMsg('Preencha e-mail e senha.', 'error'); return; }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Entrando…';

    const { data, error } = await db.auth.signInWithPassword({ email, password: pwd });

    btn.disabled = false;
    btn.textContent = 'Entrar';

    if (error) { setAuthMsg('E-mail ou senha inválidos.', 'error'); return; }

    state.user = data.user;
    setAuthMsg('', '');
    onLoggedIn();
}

async function doSignup() {
    const email = document.getElementById('emailInput').value.trim();
    const pwd   = document.getElementById('passwordInput').value;
    if (!email || !pwd) { setAuthMsg('Preencha e-mail e senha.', 'error'); return; }
    if (pwd.length < 6) { setAuthMsg('Senha: mínimo 6 caracteres.', 'error'); return; }

    const { error } = await db.auth.signUp({ email, password: pwd });
    if (error) { setAuthMsg(error.message, 'error'); return; }

    setAuthMsg('Conta criada! Verifique seu e-mail.', 'success');
}

async function doLogout() {
    await db.auth.signOut();
    state.user      = null;
    state.workoutId = null;
    document.getElementById('headerAuth').innerHTML = '';
    showAuthPanel();
    toast('Sessão encerrada');
}

function setAuthMsg(text, type) {
    const el = document.getElementById('authMessage');
    el.textContent = text;
    el.className = `auth__message${type ? ' auth__message--' + type : ''}`;
}

/* ============================================================
   SUPABASE — data layer
============================================================ */
async function loadUserData() {
    if (!state.user) return;
    setSyncBadge('loading');

    try {
        const { data: existing, error } = await db
            .from('workouts')
            .select('*')
            .eq('user_id', state.user.id)
            .eq('workout_date', TODAY_DATE)
            .maybeSingle();

        if (error) throw error;

        if (existing) {
            state.workoutId = existing.id;
            const cb = findCheckbox(TODAY_NAME);
            if (cb) {
                cb.checked = existing.completed;
                localStorage.setItem(`treino_${TODAY_NAME}`, existing.completed);
                refreshIndicator(TODAY_NAME);
            }
            await loadExerciseLogs(existing.id);
        } else {
            const { data: created, error: err2 } = await db
                .from('workouts')
                .insert({ user_id: state.user.id, workout_date: TODAY_DATE, day_of_week: TODAY_NAME, completed: false })
                .select()
                .single();
            if (err2) throw err2;

            state.workoutId = created.id;
            await createExerciseLogs(created.id, TODAY_NAME);
        }

        setSyncBadge('ok');
    } catch (err) {
        console.error('loadUserData:', err);
        setSyncBadge('error');
        toast('⚠️ Erro ao sincronizar dados');
    }
}

async function loadExerciseLogs(workoutId) {
    const { data: logs, error } = await db
        .from('exercise_logs')
        .select('exercise_name, carga_sem1')
        .eq('workout_id', workoutId);

    if (error) { console.error(error); return; }

    logs.forEach(log => {
        if (!log.carga_sem1) return;
        const input = findCargaInput(log.exercise_name);
        if (input) input.value = log.carga_sem1;
        localStorage.setItem(`carga_${log.exercise_name}`, log.carga_sem1);
    });
}

async function createExerciseLogs(workoutId, dayName) {
    const day = treinoData.find(d => d.dia === dayName);
    if (!day) return;

    const rows = [
        ...day.exercicios.map(ex => ({ workout_id: workoutId, exercise_name: ex.nome, series: ex.series, reps: ex.reps, rest_time: ex.descanso, technique: ex.tecnica, is_post_workout: false })),
        ...day.pos.map(p  => ({ workout_id: workoutId, exercise_name: p.nome,  series: '-',        reps: '-',      rest_time: '-',          technique: p.detalhe,  is_post_workout: true  })),
    ];

    const { error } = await db.from('exercise_logs').insert(rows);
    if (error) console.error('createExerciseLogs:', error);
}

async function saveWorkoutStatus(completed) {
    if (!state.user || !state.workoutId) return;
    const { error } = await db.from('workouts').update({ completed }).eq('id', state.workoutId);
    if (error) console.error(error);
}

async function saveExerciseCarga(exerciseName, carga) {
    if (!state.user || !state.workoutId) return;
    const { error } = await db
        .from('exercise_logs')
        .update({ carga_sem1: carga })
        .eq('workout_id', state.workoutId)
        .eq('exercise_name', exerciseName);
    if (error) console.error(error);
}

async function syncNow() {
    setSyncBadge('loading');
    await loadUserData();
    updateWeekProgress();
    toast('✅ Dados sincronizados');
}

/* ============================================================
   WEEK PROGRESS
============================================================ */
function updateWeekProgress() {
    const workDays = treinoData.filter(d => d.dia !== 'Sábado' && d.dia !== 'Domingo');
    const done  = workDays.filter(d => localStorage.getItem(`treino_${d.dia}`) === 'true').length;
    const total = workDays.length;

    document.getElementById('weekProgressFill').style.width = `${(done / total) * 100}%`;
    document.getElementById('weekProgressLabel').textContent = `${done}/${total} treinos concluídos`;
}

/* ============================================================
   RENDER — Treino
============================================================ */
function renderTreino() {
    const container = document.getElementById('treinoContainer');
    container.innerHTML = '';
    const accordion = document.createElement('div');
    accordion.className = 'accordion';

    treinoData.forEach(day => {
        const isToday   = day.dia === TODAY_NAME;
        const isChecked = localStorage.getItem(`treino_${day.dia}`) === 'true';

        const card = document.createElement('div');
        card.className = `day-card${isToday ? ' day-card--today' : ''}`;

        /* — Header — */
        const header = document.createElement('div');
        header.className = 'day-card__header';
        if (isToday) header.classList.add('open');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'day-card__check';
        checkbox.dataset.day = day.dia;
        checkbox.checked = isChecked;
        checkbox.addEventListener('change', async (e) => {
            e.stopPropagation();
            const checked = e.target.checked;
            localStorage.setItem(`treino_${day.dia}`, checked);
            refreshIndicator(day.dia);
            updateWeekProgress();
            toast(checked ? '✅ Treino marcado!' : 'Treino desmarcado');
            if (state.user && isToday) await saveWorkoutStatus(checked);
        });

        const indicator = document.createElement('span');
        indicator.className = 'day-card__indicator';
        indicator.dataset.indicator = day.dia;
        indicator.textContent = isChecked ? '✅' : '⬜';

        const info = document.createElement('div');
        info.className = 'day-card__info';
        info.innerHTML = `<div class="day-card__name">${day.dia}</div><div class="day-card__focus">${day.foco}</div>`;

        const left = document.createElement('div');
        left.className = 'day-card__left';
        left.append(checkbox, indicator, info);

        const right = document.createElement('div');
        right.className = 'day-card__right';
        if (isToday) right.insertAdjacentHTML('beforeend', '<span class="today-badge">Hoje</span>');
        right.insertAdjacentHTML('beforeend', `<span class="day-card__count">${day.exercicios.length} exerc.</span>`);
        right.insertAdjacentHTML('beforeend', '<span class="chevron">▼</span>');

        header.append(left, right);

        /* — Body — */
        const body = document.createElement('div');
        body.className = `day-card__body${isToday ? ' open' : ''}`;

        // Exercise table
        body.insertAdjacentHTML('beforeend', `
            <div class="ex-table__head">
                <span>Exercício</span><span>Séries</span><span>Reps</span>
                <span>Desc.</span><span>Carga (kg)</span>
            </div>
        `);

        day.exercicios.forEach(ex => {
            const savedCarga = localStorage.getItem(`carga_${ex.nome}`) || '';
            const row = document.createElement('div');
            row.className = 'ex-table__row';
            row.innerHTML = `
                <span class="ex-name">${ex.nome}</span>
                <span>${ex.series}</span>
                <span>${ex.reps}</span>
                <span>${ex.descanso}</span>
                <span><input class="carga-input" type="text" placeholder="kg"
                             data-day="${day.dia}" data-exid="${ex.nome}"
                             value="${escapeAttr(savedCarga)}" autocomplete="off"></span>
            `;

            const input = row.querySelector('.carga-input');
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                localStorage.setItem(`carga_${ex.nome}`, val);
                clearTimeout(state.saveTimers[ex.nome]);
                state.saveTimers[ex.nome] = setTimeout(async () => {
                    if (state.user) {
                        await saveExerciseCarga(ex.nome, val);
                        input.classList.add('saved');
                        setTimeout(() => input.classList.remove('saved'), 1200);
                    }
                }, 800);
            });

            body.appendChild(row);
        });

        // Post-workout
        if (day.pos.length > 0) {
            const post = document.createElement('div');
            post.className = 'post-section';
            post.innerHTML = '<div class="post-title">🏁 Pós-treino — Cardio + Abdômen</div>';
            day.pos.forEach(p => {
                post.insertAdjacentHTML('beforeend', `
                    <div class="post-row">
                        <div class="post-row__name">${p.nome}</div>
                        <div class="post-row__detail">${p.detalhe}</div>
                    </div>
                `);
            });
            body.appendChild(post);
        }

        // Toggle accordion
        header.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            const open = body.classList.toggle('open');
            header.classList.toggle('open', open);
        });

        card.append(header, body);
        accordion.appendChild(card);
    });

    container.appendChild(accordion);
}

/* ============================================================
   RENDER — Dieta
============================================================ */
function renderMacros() {
    const grid = document.getElementById('macrosGrid');
    macroData.forEach(m => {
        grid.insertAdjacentHTML('beforeend', `
            <div class="macro-card">
                <span class="macro-card__value${m.isWater ? ' macro-card__value--water' : ''}">${m.value}</span>
                <span class="macro-card__label">${m.label}</span>
            </div>
        `);
    });
}

function renderDieta() {
    const list = document.getElementById('dietaContainer');
    dietaData.forEach(meal => {
        const card = document.createElement('div');
        card.className = `meal-card${meal.isWater ? ' meal-card--water' : ''}`;
        card.innerHTML = `
            <div class="meal-card__time">${meal.horario}</div>
            <div class="meal-card__body">
                <div class="meal-card__name">${meal.nome}</div>
                <div class="meal-card__desc">${meal.descricao}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

/* ============================================================
   TABS
============================================================ */
function initTabs() {
    const btns   = document.querySelectorAll('.tab-btn');
    const panels = {
        treino: document.getElementById('tab-treino'),
        dieta:  document.getElementById('tab-dieta'),
    };

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            const target = btn.dataset.tab;
            Object.entries(panels).forEach(([key, panel]) => {
                panel.classList.toggle('active', key === target);
            });
        });
    });
}

/* ============================================================
   RESET
============================================================ */
function initResetBtn() {
    document.getElementById('resetTreinos').addEventListener('click', () => {
        if (!confirm('Limpar todos os checks e cargas salvas?')) return;
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('treino_') || k.startsWith('carga_')) localStorage.removeItem(k);
        });
        renderTreino();
        updateWeekProgress();
        if (state.user) loadUserData();
        toast('Dados limpos');
    });
}

/* ============================================================
   AUTH EVENTS
============================================================ */
function initAuthEvents() {
    document.getElementById('loginBtn').addEventListener('click', doLogin);
    document.getElementById('signupBtn').addEventListener('click', doSignup);
    const onEnter = e => { if (e.key === 'Enter') doLogin(); };
    document.getElementById('emailInput').addEventListener('keydown', onEnter);
    document.getElementById('passwordInput').addEventListener('keydown', onEnter);
}

/* ============================================================
   HELPERS
============================================================ */
function findCheckbox(dayName) {
    return document.querySelector(`.day-card__check[data-day="${dayName}"]`);
}

function findCargaInput(exName) {
    return Array.from(document.querySelectorAll('.carga-input'))
        .find(el => el.dataset.exid === exName) || null;
}

function refreshIndicator(dia) {
    const el = document.querySelector(`[data-indicator="${dia}"]`);
    if (el) el.textContent = localStorage.getItem(`treino_${dia}`) === 'true' ? '✅' : '⬜';
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
}

/* ============================================================
   SERVICE WORKER
============================================================ */
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw-novo.js')
            .catch(err => console.warn('SW não registrado:', err));
    }
}

/* ============================================================
   INIT
============================================================ */
function init() {
    renderTreino();
    renderMacros();
    renderDieta();
    initTabs();
    initResetBtn();
    initAuthEvents();
    updateWeekProgress();
    checkSession();
    registerSW();
}

init();
