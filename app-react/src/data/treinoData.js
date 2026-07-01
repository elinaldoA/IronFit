export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const TODAY_NAME = DAY_NAMES[new Date().getDay()];
export const TODAY_DATE = new Date().toISOString().split('T')[0];

export const treinoData = [
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

export const macroData = [
    { value:'2600',  label:'Kcal' },
    { value:'200g',  label:'Proteína' },
    { value:'290g',  label:'Carboidrato' },
    { value:'70g',   label:'Gordura' },
    { value:'3.5L',  label:'Água', isWater:true },
];

export const dietaData = [
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

export const MUSCLE_MAP = {
    'Peito':        ['chest'],
    'Ombro':        ['shoulders'],
    'Tríceps':      ['triceps'],
    'Costas':       ['back'],
    'Bíceps':       ['biceps'],
    'Pernas':       ['quads', 'calves'],
    'Quadríceps':   ['quads'],
    'Superiores':   ['chest', 'shoulders', 'back', 'biceps', 'triceps'],
    'Força':        [],
    'Posterior':    ['hamstrings', 'back'],
    'Glúteos':      ['glutes'],
    'Cardio Leve':  [],
    'Recuperação':  [],
    'Descanso Total': [],
};

export function getMuscleGroupsForDay(day) {
    const groups = new Set();
    day.foco.split('/').map(s => s.trim()).forEach(token => {
        (MUSCLE_MAP[token] || []).forEach(g => groups.add(g));
    });
    if (day.pos.length > 0) groups.add('abs');
    return groups;
}
