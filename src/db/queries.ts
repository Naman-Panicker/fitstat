import { type SQLiteDatabase } from 'expo-sqlite';
import { FoodItem, MealLog, MealType } from '../types';

// ─── Public types ────────────────────────────────────────────────────────────

export type DaySummary = {
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // "Today", "Yesterday", "Monday", "May 19"
  totalCalories: number;
  meals: MealLog[];
};

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

// ─── History queries ─────────────────────────────────────────────────────────

/**
 * Returns distinct logged dates (most recent first) older than `beforeDate`.
 * Used as a cursor for lazy-loading history.
 */
export async function getLoggedDates(
  db: SQLiteDatabase,
  userId: string,
  beforeDate: string,
  limit: number
): Promise<string[]> {
  const rows = await db.getAllAsync<{ logged_at: string }>(
    `SELECT DISTINCT logged_at
     FROM meal_logs
     WHERE user_id = ? AND logged_at < ?
     ORDER BY logged_at DESC
     LIMIT ?`,
    userId,
    beforeDate,
    limit
  );
  return rows.map((r) => r.logged_at);
}

/**
 * Returns all meal logs for a user between two dates (inclusive),
 * ordered by date descending, then insertion order.
 */
export async function getMealLogsByDateRange(
  db: SQLiteDatabase,
  userId: string,
  startDate: string,
  endDate: string
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
     WHERE ml.user_id = ? AND ml.logged_at >= ? AND ml.logged_at <= ?
     ORDER BY ml.logged_at DESC, ml.rowid`,
    userId,
    startDate,
    endDate
  );

  return rows.map(toMealLog);
}

// ─── Grouping helpers ────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD. */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Returns yesterday's date as YYYY-MM-DD. */
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Formats a YYYY-MM-DD date into a human-readable label. */
function formatDayLabel(date: string): string {
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (date === today) return 'Today';
  if (date === yesterday) return 'Yesterday';

  // Parse as local date (avoid timezone shift)
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayName = dt.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dayName}, ${monthDay}`;
}

/**
 * Groups a flat array of meal logs (assumed sorted by date desc)
 * into per-day summaries.
 */
export function groupLogsByDay(logs: MealLog[]): DaySummary[] {
  const map = new Map<string, MealLog[]>();

  for (const log of logs) {
    const date = log.loggedAt;
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(log);
  }

  const days: DaySummary[] = [];
  for (const [date, meals] of map) {
    const totalCalories = meals.reduce(
      (sum, m) => sum + Math.round(m.food.calories * m.servings),
      0
    );
    days.push({
      date,
      dayLabel: formatDayLabel(date),
      totalCalories,
      meals,
    });
  }

  // Sort most recent first
  days.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  return days;
}

// ─── Workout queries ─────────────────────────────────────────────────────────

import { MuscleGroup, Exercise, WorkoutLog, ExerciseSet } from '../types';

export type LoggedSetDetail = {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  weight: number;
  reps: number;
  createdAt: string;
};

/**
 * Fetches all exercises matching a muscle group, with an optional search query.
 * Returns standard global exercises (user_id is null) plus user's custom exercises.
 */
export async function getExercisesByMuscleGroup(
  db: SQLiteDatabase,
  muscleGroup: MuscleGroup,
  searchQuery?: string
): Promise<Exercise[]> {
  const query = searchQuery ? `%${searchQuery}%` : null;

  if (query) {
    const rows = await db.getAllAsync<{
      id: string;
      user_id: string | null;
      name: string;
      muscle_group: string;
    }>(
      `SELECT id, user_id, name, muscle_group
       FROM exercises
       WHERE muscle_group = ? AND name LIKE ?
       ORDER BY user_id IS NOT NULL, name COLLATE NOCASE`,
      muscleGroup,
      query
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      muscleGroup: r.muscle_group as MuscleGroup,
    }));
  } else {
    const rows = await db.getAllAsync<{
      id: string;
      user_id: string | null;
      name: string;
      muscle_group: string;
    }>(
      `SELECT id, user_id, name, muscle_group
       FROM exercises
       WHERE muscle_group = ?
       ORDER BY user_id IS NOT NULL, name COLLATE NOCASE`,
      muscleGroup
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      muscleGroup: r.muscle_group as MuscleGroup,
    }));
  }
}

/**
 * Creates a custom exercise for a user.
 */
export async function addCustomExercise(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  muscleGroup: MuscleGroup
): Promise<Exercise> {
  const id = `cust-ex-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  await db.runAsync(
    'INSERT INTO exercises (id, user_id, name, muscle_group) VALUES (?, ?, ?, ?)',
    id,
    userId,
    name.trim(),
    muscleGroup
  );

  return {
    id,
    userId,
    name: name.trim(),
    muscleGroup,
  };
}

/**
 * Returns today's workout log or creates it if not exists.
 */
export async function getOrCreateTodayWorkoutLog(
  db: SQLiteDatabase,
  userId: string
): Promise<WorkoutLog> {
  const today = todayStr();

  // Try to find
  const row = await db.getFirstAsync<{ id: string; user_id: string; logged_at: string }>(
    'SELECT id, user_id, logged_at FROM workout_logs WHERE user_id = ? AND logged_at = ?',
    userId,
    today
  );

  if (row) {
    return {
      id: row.id,
      userId: row.user_id,
      loggedAt: row.logged_at,
    };
  }

  // Create
  const id = `wl-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  await db.runAsync(
    'INSERT INTO workout_logs (id, user_id, logged_at) VALUES (?, ?, ?)',
    id,
    userId,
    today
  );

  return {
    id,
    userId,
    loggedAt: today,
  };
}

/**
 * Logs a single set for an exercise.
 */
export async function logExerciseSet(
  db: SQLiteDatabase,
  workoutLogId: string,
  exerciseId: string,
  weight: number,
  reps: number
): Promise<ExerciseSet> {
  const id = `set-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO exercise_sets (id, workout_log_id, exercise_id, weight, reps, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    workoutLogId,
    exerciseId,
    weight,
    reps,
    now
  );

  return {
    id,
    workoutLogId,
    exerciseId,
    weight,
    reps,
    createdAt: now,
  };
}

/**
 * Fetches all completed sets for today.
 */
export async function getTodayLoggedSets(
  db: SQLiteDatabase,
  userId: string
): Promise<LoggedSetDetail[]> {
  const today = todayStr();
  const rows = await db.getAllAsync<{
    id: string;
    workout_log_id: string;
    exercise_id: string;
    exercise_name: string;
    muscle_group: string;
    weight: number;
    reps: number;
    created_at: string;
  }>(
    `SELECT
       es.id,
       es.workout_log_id,
       es.exercise_id,
       e.name AS exercise_name,
       e.muscle_group,
       es.weight,
       es.reps,
       es.created_at
     FROM exercise_sets es
     JOIN workout_logs wl ON wl.id = es.workout_log_id
     JOIN exercises e ON e.id = es.exercise_id
     WHERE wl.user_id = ? AND wl.logged_at = ?
     ORDER BY es.created_at ASC`,
    userId,
    today
  );

  return rows.map((r) => ({
    id: r.id,
    workoutLogId: r.workout_log_id,
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    muscleGroup: r.muscle_group as MuscleGroup,
    weight: r.weight,
    reps: r.reps,
    createdAt: r.created_at,
  }));
}

/**
 * Fetches all completed sets for a specific exercise today.
 */
export async function getTodayLoggedSetsForExercise(
  db: SQLiteDatabase,
  userId: string,
  exerciseId: string
): Promise<ExerciseSet[]> {
  const today = todayStr();
  const rows = await db.getAllAsync<{
    id: string;
    workout_log_id: string;
    exercise_id: string;
    weight: number;
    reps: number;
    created_at: string;
  }>(
    `SELECT es.id, es.workout_log_id, es.exercise_id, es.weight, es.reps, es.created_at
     FROM exercise_sets es
     JOIN workout_logs wl ON wl.id = es.workout_log_id
     WHERE wl.user_id = ? AND wl.logged_at = ? AND es.exercise_id = ?
     ORDER BY es.created_at ASC`,
    userId,
    today,
    exerciseId
  );

  return rows.map((r) => ({
    id: r.id,
    workoutLogId: r.workout_log_id,
    exerciseId: r.exercise_id,
    weight: r.weight,
    reps: r.reps,
    createdAt: r.created_at,
  }));
}

/**
 * Fetches user preference value by key.
 */
export async function getUserPreference(
  db: SQLiteDatabase,
  key: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM user_preferences WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}

/**
 * Saves user preference (inserts or replaces).
 */
export async function setUserPreference(
  db: SQLiteDatabase,
  key: string,
  value: string
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`,
    key,
    value
  );
}

/**
 * Updates weight and reps for a logged set.
 */
export async function updateExerciseSet(
  db: SQLiteDatabase,
  setId: string,
  weight: number,
  reps: number
): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_sets SET weight = ?, reps = ? WHERE id = ?`,
    weight,
    reps,
    setId
  );
}

/**
 * Deletes a logged set.
 */
export async function deleteExerciseSet(
  db: SQLiteDatabase,
  setId: string
): Promise<void> {
  await db.runAsync(
    `DELETE FROM exercise_sets WHERE id = ?`,
    setId
  );
}



