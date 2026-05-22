import { type SQLiteDatabase } from 'expo-sqlite';
import { FoodItem, MealLog } from '../types';

// ─── Row types returned by SQLite ────────────────────────────────────────────

type FoodItemRow = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type MealLogRow = {
  id: string;
  food_id: string;
  meal_type: string;
  servings: number;
  food_name: string;
  food_calories: number;
  food_protein: number;
  food_carbs: number;
  food_fat: number;
  food_fiber: number;
};

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getAllFoodItems(
  db: SQLiteDatabase,
  userId: string
): Promise<FoodItem[]> {
  const rows = await db.getAllAsync<FoodItemRow>(
    'SELECT id, name, calories, protein, carbs, fat, fiber FROM food_items WHERE user_id = ? ORDER BY name COLLATE NOCASE',
    userId
  );
  return rows;
}

export async function getAllMealLogs(
  db: SQLiteDatabase,
  userId: string
): Promise<MealLog[]> {
  const rows = await db.getAllAsync<MealLogRow>(
    `SELECT
       ml.id,
       ml.food_id,
       ml.meal_type,
       ml.servings,
       fi.name     AS food_name,
       fi.calories  AS food_calories,
       fi.protein   AS food_protein,
       fi.carbs     AS food_carbs,
       fi.fat       AS food_fat,
       fi.fiber     AS food_fiber
     FROM meal_logs ml
     JOIN food_items fi ON fi.id = ml.food_id
     WHERE ml.user_id = ?
     ORDER BY ml.rowid`,
    userId
  );

  return rows.map((r) => ({
    id: r.id,
    mealType: r.meal_type as MealLog['mealType'],
    servings: r.servings,
    food: {
      id: r.food_id,
      name: r.food_name,
      calories: r.food_calories,
      protein: r.food_protein,
      carbs: r.food_carbs,
      fat: r.food_fat,
      fiber: r.food_fiber,
    },
  }));
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function insertFoodItem(
  db: SQLiteDatabase,
  food: FoodItem,
  userId: string
): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO food_items (id, user_id, name, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    food.id,
    userId,
    food.name,
    food.calories,
    food.protein,
    food.carbs,
    food.fat,
    food.fiber
  );
}

export async function insertMealLog(
  db: SQLiteDatabase,
  log: MealLog,
  userId: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO meal_logs (id, user_id, food_id, meal_type, servings) VALUES (?, ?, ?, ?, ?)',
    log.id,
    userId,
    log.food.id,
    log.mealType,
    log.servings
  );
}

export async function deleteMealLog(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM meal_logs WHERE id = ?', id);
}
