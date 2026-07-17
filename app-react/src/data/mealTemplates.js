import { db } from '../lib/supabase';
import { dietaData } from './treinoData';

// 5 templates de refeição — um por objetivo (`meta`), no mesmo espírito do
// generatePlan em workoutTemplates.js. O de 'massa' reaproveita o cardápio
// estático padrão (dietaData) como está. As metas de macro em si continuam
// vindo de getMacroGoals (treinoData.js); aqui só variam os alimentos e o
// número/horário das refeições por objetivo.
//
// Mesmo esquema de fallback de workoutTemplates.js: generateMealPlan busca
// primeiro em public.meal_templates (editável via app-admin) e só usa estes
// arrays locais se o fetch falhar.

// kcal/proteina/carboidrato/gordura são estimativas aproximadas — ver
// comentário equivalente em dietaData (treinoData.js).
const FORCA = [
    { horario: '07:00', nome: '☀️ Café da manhã',      descricao: '3 ovos inteiros + 2 claras (mexidos) · 60g aveia · 1 banana · Café preto', kcal:560, proteina:34, carboidrato:66, gordura:20 },
    { horario: '10:00', nome: '🍏 Lanche da manhã',     descricao: '1 scoop Whey · 30g castanhas · 1 fruta', kcal:380, proteina:28, carboidrato:27, gordura:19 },
    { horario: '12:30', nome: '🥗 Almoço',              descricao: '250g carne vermelha magra ou frango · 300g arroz branco · 150g batata-doce · Salada com azeite', kcal:1130, proteina:75, carboidrato:117, gordura:35 },
    { horario: '17:00', nome: '⚡ Pré-treino',          descricao: '200g frango ou peixe · 2 fatias de pão integral · 1 banana · Café preto', kcal:520, proteina:59, carboidrato:48, gordura:10 },
    { horario: '19:30', nome: '🏋️ Treino',              descricao: 'Beba **500ml a 1L** de água durante o treino', kcal:0, proteina:0, carboidrato:0, gordura:0 },
    { horario: '20:45', nome: '🍽️ Pós-treino / Jantar', descricao: '220g carne vermelha ou peixe · 250g arroz branco ou macarrão · Legumes cozidos', kcal:860, proteina:65, carboidrato:82, gordura:29 },
    { horario: '22:30', nome: '🥛 Ceia (opcional)',     descricao: 'Se bater fome: 2 ovos cozidos ou 1 scoop caseína com água', kcal:140, proteina:12, carboidrato:1, gordura:10 },
];

const EMAGRECER = [
    { horario: '07:30', nome: '☀️ Café da manhã',       descricao: '3 claras + 1 ovo inteiro (mexidos) · 30g aveia · 1/2 banana · Café preto sem açúcar', kcal:280, proteina:21, carboidrato:32, gordura:7 },
    { horario: '10:30', nome: '🍏 Lanche da manhã',      descricao: '1 iogurte natural desnatado · 1 fruta · Canela', kcal:170, proteina:10, carboidrato:32, gordura:0 },
    { horario: '13:00', nome: '🥗 Almoço',               descricao: '150g frango grelhado ou peixe · 100g arroz integral ou quinoa · Salada à vontade com 1 col. azeite', kcal:500, proteina:49, carboidrato:27, gordura:20 },
    { horario: '16:30', nome: '⚡ Pré-treino leve',       descricao: 'Café preto (sem açúcar) · 1 fruta', kcal:80, proteina:0, carboidrato:20, gordura:0 },
    { horario: '19:00', nome: '🏋️ Treino',               descricao: 'Beba **500ml a 1L** de água durante o treino', kcal:0, proteina:0, carboidrato:0, gordura:0 },
    { horario: '20:30', nome: '🍽️ Pós-treino / Jantar',  descricao: '150g peixe ou frango grelhado · Legumes no vapor à vontade · Salada verde', kcal:240, proteina:35, carboidrato:19, gordura:3 },
];

const DEFINICAO = [
    { horario: '07:30', nome: '☀️ Café da manhã',       descricao: '3 claras + 1 ovo inteiro (mexidos) · 20g aveia · Café preto', kcal:200, proteina:19, carboidrato:15, gordura:7 },
    { horario: '10:30', nome: '🍏 Lanche da manhã',      descricao: '1 scoop Whey (com água) · 15g amêndoas', kcal:210, proteina:27, carboidrato:6, gordura:9 },
    { horario: '13:00', nome: '🥗 Almoço',               descricao: '200g frango grelhado · Salada verde à vontade com azeite · Legumes no vapor', kcal:520, proteina:65, carboidrato:15, gordura:21 },
    { horario: '17:00', nome: '⚡ Pré-treino',            descricao: '150g batata-doce · 200g frango ou peixe · 1 banana pequena', kcal:500, proteina:55, carboidrato:48, gordura:8 },
    { horario: '19:30', nome: '🏋️ Treino',               descricao: 'Beba **500ml a 1L** de água durante o treino', kcal:0, proteina:0, carboidrato:0, gordura:0 },
    { horario: '20:45', nome: '🍽️ Pós-treino / Jantar',  descricao: '200g peixe ou frango · 150g arroz branco · Salada verde', kcal:510, proteina:57, carboidrato:45, gordura:9 },
    { horario: '23:00', nome: '🥛 Ceia (opcional)',       descricao: 'Se bater fome: 1 scoop caseína ou 2 claras cozidas', kcal:110, proteina:24, carboidrato:3, gordura:1 },
];

const SAUDE = [
    { horario: '07:30', nome: '☀️ Café da manhã',   descricao: '2 ovos + 1 fatia de pão integral · 1 fruta · Café ou chá', kcal:290, proteina:15, carboidrato:33, gordura:11 },
    { horario: '10:30', nome: '🍏 Lanche da manhã',  descricao: '1 iogurte natural · 20g castanhas · 1 fruta', kcal:290, proteina:13, carboidrato:35, gordura:11 },
    { horario: '12:30', nome: '🥗 Almoço',           descricao: '150g proteína (frango, peixe ou ovos) · Arroz e feijão (porção moderada) · Salada e legumes à vontade', kcal:560, proteina:58, carboidrato:55, gordura:7 },
    { horario: '16:00', nome: '🍏 Lanche da tarde',  descricao: '1 fruta · Punhado de castanhas ou 1 iogurte', kcal:190, proteina:6, carboidrato:27, gordura:6 },
    { horario: '19:00', nome: '🏋️ Treino (se houver)', descricao: 'Beba **500ml a 1L** de água durante a atividade', kcal:0, proteina:0, carboidrato:0, gordura:0 },
    { horario: '20:00', nome: '🍽️ Jantar',           descricao: 'Proteína magra · Legumes · Salada — porções moderadas', kcal:350, proteina:35, carboidrato:20, gordura:10 },
];

// Objetivo cardio/resistência — sem variante local por restrição (só a
// versão padrão fica no bundle; vegetariano/low_carb vivem só no banco, ver
// comentário abaixo em fetchBaseMealTemplate).
const RESISTENCIA = [
    { horario: '07:00', nome: '☀️ Café da manhã',  descricao: '60g aveia + 1 banana · 2 ovos · Café preto', kcal:480, proteina:22, carboidrato:70, gordura:12 },
    { horario: '10:00', nome: '🍏 Lanche da manhã', descricao: '1 iogurte natural · Granola · 1 fruta', kcal:350, proteina:14, carboidrato:55, gordura:9 },
    { horario: '12:30', nome: '🥗 Almoço',          descricao: '180g frango ou peixe · 250g arroz ou macarrão · Legumes · Salada com azeite', kcal:750, proteina:55, carboidrato:95, gordura:18 },
    { horario: '16:00', nome: '⚡ Pré-treino',       descricao: 'Banana + mel · Café preto', kcal:200, proteina:3, carboidrato:48, gordura:1 },
    { horario: '18:00', nome: '🏋️ Treino',          descricao: 'Beba **500ml a 1L** de água durante o treino', kcal:0, proteina:0, carboidrato:0, gordura:0 },
    { horario: '19:30', nome: '🍽️ Pós-treino / Jantar', descricao: '180g frango ou peixe · 200g batata-doce ou arroz · Legumes cozidos', kcal:650, proteina:50, carboidrato:80, gordura:14 },
    { horario: '21:30', nome: '🥛 Ceia (opcional)', descricao: 'Se bater fome: 1 iogurte natural ou 2 ovos cozidos', kcal:180, proteina:15, carboidrato:10, gordura:8 },
];

const BASE_MEAL_TEMPLATES = {
    massa: dietaData,
    forca: FORCA,
    emagrecer: EMAGRECER,
    definicao: DEFINICAO,
    saude: SAUDE,
    resistencia: RESISTENCIA,
};

// Busca a combinação exata (meta + restrição alimentar); se essa variante
// não existir no banco, degrada pra versão padrão do mesmo objetivo antes de
// cair no array local — mesma cadeia de resiliência de sempre, só que agora
// com um passo a mais porque existe mais de um candidato por objetivo.
async function fetchBaseMealTemplate(meta, restricao) {
    const wanted = restricao || 'padrao';
    try {
        const { data, error } = await db.from('meal_templates').select('meals').eq('meta', meta).eq('restricao', wanted).maybeSingle();
        if (!error && Array.isArray(data?.meals) && data.meals.length > 0) return data.meals;
    } catch { /* segue pro próximo fallback */ }

    if (wanted !== 'padrao') {
        try {
            const { data, error } = await db.from('meal_templates').select('meals').eq('meta', meta).eq('restricao', 'padrao').maybeSingle();
            if (!error && Array.isArray(data?.meals) && data.meals.length > 0) return data.meals;
        } catch { /* segue pro fallback local */ }
    }

    return BASE_MEAL_TEMPLATES[meta] || BASE_MEAL_TEMPLATES.saude;
}

// meta decide o objetivo nutricional (kcal/macros vêm de getMacroGoals, em
// treinoData.js); restricaoAlimentar decide quais alimentos entram no
// cardápio pra chegar lá.
export async function generateMealPlan({ meta, restricaoAlimentar }) {
    const base = await fetchBaseMealTemplate(meta, restricaoAlimentar);
    return base.map(meal => ({ ...meal }));
}
