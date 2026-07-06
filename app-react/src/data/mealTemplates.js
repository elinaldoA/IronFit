import { dietaData } from './treinoData';

// 5 templates de refeição — um por objetivo (`meta`), no mesmo espírito do
// generatePlan em workoutTemplates.js. O de 'massa' reaproveita o cardápio
// estático padrão (dietaData) como está. As metas de macro em si continuam
// vindo de getMacroGoals (treinoData.js); aqui só variam os alimentos e o
// número/horário das refeições por objetivo.

const FORCA = [
    { horario: '07:00', nome: '☀️ Café da manhã',      descricao: '3 ovos inteiros + 2 claras (mexidos) · 60g aveia · 1 banana · Café preto' },
    { horario: '10:00', nome: '🍏 Lanche da manhã',     descricao: '1 scoop Whey · 30g castanhas · 1 fruta' },
    { horario: '12:30', nome: '🥗 Almoço',              descricao: '250g carne vermelha magra ou frango · 300g arroz branco · 150g batata-doce · Salada com azeite' },
    { horario: '17:00', nome: '⚡ Pré-treino',          descricao: '200g frango ou peixe · 2 fatias de pão integral · 1 banana · Café preto' },
    { horario: '19:30', nome: '🏋️ Treino',              descricao: 'Beba <strong>500ml a 1L</strong> de água durante o treino' },
    { horario: '20:45', nome: '🍽️ Pós-treino / Jantar', descricao: '220g carne vermelha ou peixe · 250g arroz branco ou macarrão · Legumes cozidos' },
    { horario: '22:30', nome: '🥛 Ceia (opcional)',     descricao: 'Se bater fome: 2 ovos cozidos ou 1 scoop caseína com água' },
];

const EMAGRECER = [
    { horario: '07:30', nome: '☀️ Café da manhã',       descricao: '3 claras + 1 ovo inteiro (mexidos) · 30g aveia · 1/2 banana · Café preto sem açúcar' },
    { horario: '10:30', nome: '🍏 Lanche da manhã',      descricao: '1 iogurte natural desnatado · 1 fruta · Canela' },
    { horario: '13:00', nome: '🥗 Almoço',               descricao: '150g frango grelhado ou peixe · 100g arroz integral ou quinoa · Salada à vontade com 1 col. azeite' },
    { horario: '16:30', nome: '⚡ Pré-treino leve',       descricao: 'Café preto (sem açúcar) · 1 fruta' },
    { horario: '19:00', nome: '🏋️ Treino',               descricao: 'Beba <strong>500ml a 1L</strong> de água durante o treino' },
    { horario: '20:30', nome: '🍽️ Pós-treino / Jantar',  descricao: '150g peixe ou frango grelhado · Legumes no vapor à vontade · Salada verde' },
];

const DEFINICAO = [
    { horario: '07:30', nome: '☀️ Café da manhã',       descricao: '3 claras + 1 ovo inteiro (mexidos) · 20g aveia · Café preto' },
    { horario: '10:30', nome: '🍏 Lanche da manhã',      descricao: '1 scoop Whey (com água) · 15g amêndoas' },
    { horario: '13:00', nome: '🥗 Almoço',               descricao: '200g frango grelhado · Salada verde à vontade com azeite · Legumes no vapor' },
    { horario: '17:00', nome: '⚡ Pré-treino',            descricao: '150g batata-doce · 200g frango ou peixe · 1 banana pequena' },
    { horario: '19:30', nome: '🏋️ Treino',               descricao: 'Beba <strong>500ml a 1L</strong> de água durante o treino' },
    { horario: '20:45', nome: '🍽️ Pós-treino / Jantar',  descricao: '200g peixe ou frango · 150g arroz branco · Salada verde' },
    { horario: '23:00', nome: '🥛 Ceia (opcional)',       descricao: 'Se bater fome: 1 scoop caseína ou 2 claras cozidas' },
];

const SAUDE = [
    { horario: '07:30', nome: '☀️ Café da manhã',   descricao: '2 ovos + 1 fatia de pão integral · 1 fruta · Café ou chá' },
    { horario: '10:30', nome: '🍏 Lanche da manhã',  descricao: '1 iogurte natural · 20g castanhas · 1 fruta' },
    { horario: '12:30', nome: '🥗 Almoço',           descricao: '150g proteína (frango, peixe ou ovos) · Arroz e feijão (porção moderada) · Salada e legumes à vontade' },
    { horario: '16:00', nome: '🍏 Lanche da tarde',  descricao: '1 fruta · Punhado de castanhas ou 1 iogurte' },
    { horario: '19:00', nome: '🏋️ Treino (se houver)', descricao: 'Beba <strong>500ml a 1L</strong> de água durante a atividade' },
    { horario: '20:00', nome: '🍽️ Jantar',           descricao: 'Proteína magra · Legumes · Salada — porções moderadas' },
];

const BASE_MEAL_TEMPLATES = {
    massa: dietaData,
    forca: FORCA,
    emagrecer: EMAGRECER,
    definicao: DEFINICAO,
    saude: SAUDE,
};

// meta é o único fator considerado — sexo/idade/peso/altura já entram no
// cálculo das metas de macro (getMacroGoals, em treinoData.js).
export function generateMealPlan({ meta }) {
    const base = BASE_MEAL_TEMPLATES[meta] || BASE_MEAL_TEMPLATES.saude;
    return base.map(meal => ({ ...meal }));
}
