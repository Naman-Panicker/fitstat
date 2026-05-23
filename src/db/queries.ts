import { type SQLiteDatabase } from 'expo-sqlite';
import { FoodItem, MealLog } from '../types';

// ─── Row types returned by SQLite ────────────────────────────────────────────

type FoodItemRow = {
  id: string;
  user_id: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  synced_at: string | null;
};

type MealLogRow = {
  id: string;
  food_id: string;
  meal_type: string;
  servings: number;
  logged_at: string;
  synced_at: string | null;
  food_user_id: string | null;
  food_name: string;
  food_calories: number;
  food_protein: number;
  food_carbs: number;
  food_fat: number;
  food_fiber: number;
  food_synced_at: string | null;
};

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * Returns all food items visible to the user:
 *   - global items (user_id IS NULL)
 *   - user-owned items (user_id = ?)
 */
export async function getAllFoodItems(
  db: SQLiteDatabase,
  userId: string
): Promise<FoodItem[]> {
  const rows = await db.getAllAsync<FoodItemRow>(
    `SELECT id, user_id, name, calories, protein, carbs, fat, fiber, synced_at
     FROM food_items
     WHERE user_id IS NULL OR user_id = ?
     ORDER BY name COLLATE NOCASE`,
    userId
  );
  return rows.map(toFoodItem);
}

/**
 * Returns meal logs for a specific user on a specific date.
 * @param date - YYYY-MM-DD string
 */
export async function getMealLogsByDate(
  db: SQLiteDatabase,
  userId: string,
  date: string
): Promise<MealLog[]> {
  const rows = await db.getAllAsync<MealLogRow>(
    `SELECT
       ml.id,
       ml.food_id,
       ml.meal_type,
       ml.servings,
       ml.logged_at,
       ml.synced_at,
       fi.user_id   AS food_user_id,
       fi.name      AS food_name,
       fi.calories   AS food_calories,
       fi.protein    AS food_protein,
       fi.carbs      AS food_carbs,
       fi.fat        AS food_fat,
       fi.fiber      AS food_fiber,
       fi.synced_at  AS food_synced_at
     FROM meal_logs ml
     JOIN food_items fi ON fi.id = ml.food_id
     WHERE ml.user_id = ? AND ml.logged_at = ?
     ORDER BY ml.rowid`,
    userId,
    date
  );

  return rows.map(toMealLog);
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function insertFoodItem(
  db: SQLiteDatabase,
  food: FoodItem,
  userId: string | null
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
  userId: string,
  date: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO meal_logs (id, user_id, food_id, meal_type, servings, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
    log.id,
    userId,
    log.food.id,
    log.mealType,
    log.servings,
    date
  );
}

export async function deleteMealLog(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM meal_logs WHERE id = ?', id);
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toFoodItem(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    syncedAt: row.synced_at,
  };
}

function toMealLog(r: MealLogRow): MealLog {
  return {
    id: r.id,
    mealType: r.meal_type as MealLog['mealType'],
    servings: r.servings,
    loggedAt: r.logged_at,
    syncedAt: r.synced_at,
    food: {
      id: r.food_id,
      userId: r.food_user_id,
      name: r.food_name,
      calories: r.food_calories,
      protein: r.food_protein,
      carbs: r.food_carbs,
      fat: r.food_fat,
      fiber: r.food_fiber,
      syncedAt: r.food_synced_at,
    },
  };
}
