import { db } from './supabase';
import { parseDecimal } from './utils';

export async function fetchRecipes(userId) {
  const { data, error } = await db
    .from('saved_recipes')
    .select('id, name, kcal, proteina, carboidrato, gordura, ingredientes')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addRecipe(userId, recipe) {
  const { data, error } = await db
    .from('saved_recipes')
    .insert({
      user_id: userId,
      name: recipe.name,
      kcal: parseDecimal(recipe.kcal) || 0,
      proteina: parseDecimal(recipe.proteina) || 0,
      carboidrato: parseDecimal(recipe.carboidrato) || 0,
      gordura: parseDecimal(recipe.gordura) || 0,
      ingredientes: recipe.ingredientes?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecipe(id, userId) {
  const { error } = await db.from('saved_recipes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
