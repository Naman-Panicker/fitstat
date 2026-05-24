import { type SQLiteDatabase } from 'expo-sqlite';
import { FoodItem, MealLog, MuscleGroup, Exercise, WorkoutLog, ExerciseSet } from '../types';

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
  userId: string,
  key: string
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM user_preferences WHERE user_id = ? AND key = ?`,
    userId,
    key
  );
  return row?.value ?? null;
}

/**
 * Saves user preference (inserts or replaces).
 */
export async function setUserPreference(
  db: SQLiteDatabase,
  userId: string,
  key: string,
  value: string
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)`,
    userId,
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

/**
 * Fetches all completed sets for a specific user and date string.
 */
export async function getLoggedSetsForDate(
  db: SQLiteDatabase,
  userId: string,
  dateStr: string
): Promise<LoggedSetDetail[]> {
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
    dateStr
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
 * Returns a workout log for a specific date or creates it if not exists.
 */
export async function getOrCreateWorkoutLogForDate(
  db: SQLiteDatabase,
  userId: string,
  dateStr: string
): Promise<WorkoutLog> {
  // Try to find
  const row = await db.getFirstAsync<{ id: string; user_id: string; logged_at: string }>(
    'SELECT id, user_id, logged_at FROM workout_logs WHERE user_id = ? AND logged_at = ?',
    userId,
    dateStr
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
    dateStr
  );

  return {
    id,
    userId,
    loggedAt: dateStr,
  };
}

/**
 * Fetches all historical sets for a specific exercise grouped by date.
 */
export async function getExerciseHistory(
  db: SQLiteDatabase,
  userId: string,
  exerciseId: string
): Promise<{ date: string; sets: { id: string; weight: number; reps: number; createdAt: string }[] }[]> {
  const rows = await db.getAllAsync<{
    id: string;
    weight: number;
    reps: number;
    created_at: string;
    logged_at: string;
  }>(
    `SELECT es.id, es.weight, es.reps, es.created_at, wl.logged_at
     FROM exercise_sets es
     JOIN workout_logs wl ON wl.id = es.workout_log_id
     WHERE wl.user_id = ? AND es.exercise_id = ?
     ORDER BY wl.logged_at DESC, es.created_at ASC`,
    userId,
    exerciseId
  );

  const map = new Map<string, { id: string; weight: number; reps: number; createdAt: string }[]>();
  for (const r of rows) {
    if (!map.has(r.logged_at)) {
      map.set(r.logged_at, []);
    }
    map.get(r.logged_at)!.push({
      id: r.id,
      weight: r.weight,
      reps: r.reps,
      createdAt: r.created_at,
    });
  }

  return Array.from(map.entries()).map(([date, sets]) => ({
    date,
    sets,
  }));
}

/**
 * Fetches all completed sets for a specific exercise and date string.
 */
export async function getLoggedSetsForExerciseOnDate(
  db: SQLiteDatabase,
  userId: string,
  exerciseId: string,
  dateStr: string
): Promise<ExerciseSet[]> {
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
    dateStr,
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

export type UserProfile = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

/**
 * Retrieves a user's profile details.
 */
export async function getUserProfile(
  db: SQLiteDatabase,
  userId: string
): Promise<UserProfile | null> {
  try {
    const row = await db.getFirstAsync<{
      id: string;
      username: string;
      name: string;
      email: string | null;
      avatar_url: string | null;
    }>(
      'SELECT id, username, name, email, avatar_url FROM users WHERE id = ?',
      userId
    );
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
    };
  } catch (e) {
    console.error('Failed to get user profile:', e);
    return null;
  }
}

/**
 * Updates a user's profile username and name.
 */
export async function updateUserProfile(
  db: SQLiteDatabase,
  userId: string,
  username: string,
  name: string
): Promise<void> {
  await db.runAsync(
    'UPDATE users SET username = ?, name = ? WHERE id = ?',
    username,
    name,
    userId
  );
}

/**
 * Calculates the active daily logging streak for a user.
 * A streak counts consecutive days of logging meals or workouts.
 * If today has no log, but yesterday had a log, the streak is alive (counting through yesterday).
 * If yesterday had no log, the streak resets to 0.
 * A streak officially activates (glows) only when streakCount >= 2 consecutive days.
 */
export async function calculateActiveLoggingStreak(
  db: SQLiteDatabase,
  userId: string
): Promise<{ streakCount: number; isActive: boolean }> {
  try {
    const rows = await db.getAllAsync<{ logged_at: string }>(
      `SELECT logged_at FROM meal_logs WHERE user_id = ?
       UNION
       SELECT logged_at FROM workout_logs WHERE user_id = ?
       ORDER BY logged_at DESC`,
      userId,
      userId
    );

    if (rows.length === 0) {
      return { streakCount: 0, isActive: false };
    }

    const loggedDates = rows.map((r) => r.logged_at);

    // Format date in local YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(new Date());

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const hasLoggedToday = loggedDates.includes(todayStr);
    const hasLoggedYesterday = loggedDates.includes(yesterdayStr);

    if (!hasLoggedToday && !hasLoggedYesterday) {
      return { streakCount: 0, isActive: false };
    }

    let currentCheckDate = hasLoggedToday ? new Date() : yesterday;
    let streakCount = 0;

    while (true) {
      const checkStr = formatDate(currentCheckDate);
      if (loggedDates.includes(checkStr)) {
        streakCount++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }

    // According to consecutive day criteria: "streak activates from: two consecutive days"
    const isActive = streakCount >= 2;

    return { streakCount, isActive };
  } catch (e) {
    console.error('Failed to calculate active logging streak:', e);
    return { streakCount: 0, isActive: false };
  }
}

export interface SystemNotification {
  id: string;
  userId: string;
  type: string; // 'streak' | 'sync' | 'workout' | 'meal'
  title: string;
  description: string;
  read: number; // 0 or 1
  createdAt: string;
}

/**
 * Fetches all unread active system notifications for a user.
 */
export async function fetchUserNotifications(
  db: SQLiteDatabase,
  userId: string
): Promise<SystemNotification[]> {
  try {
    const rows = await db.getAllAsync<{
      id: string;
      user_id: string;
      type: string;
      title: string;
      description: string;
      read: number;
      created_at: string;
    }>(
      'SELECT id, user_id, type, title, description, read, created_at FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC',
      userId
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      description: r.description,
      read: r.read,
      createdAt: r.created_at,
    }));
  } catch (e) {
    console.error('Failed to fetch user notifications:', e);
    return [];
  }
}

/**
 * Marks all notifications for a user as read.
 */
export async function clearAllNotifications(
  db: SQLiteDatabase,
  userId: string
): Promise<void> {
  try {
    await db.runAsync(
      'UPDATE notifications SET read = 1 WHERE user_id = ?',
      userId
    );
  } catch (e) {
    console.error('Failed to clear notifications:', e);
  }
}

/**
 * Saves a notification preference toggle in SQLite.
 */
export async function saveNotificationPreference(
  db: SQLiteDatabase,
  userId: string,
  key: string,
  value: string
): Promise<void> {
  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)',
      userId,
      key,
      value
    );
  } catch (e) {
    console.error('Failed to save notification preference:', e);
  }
}

/**
 * Fetches all active notification preference toggles from user_preferences.
 */
export async function getNotificationPreferences(
  db: SQLiteDatabase,
  userId: string
): Promise<Record<string, string>> {
  try {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM user_preferences WHERE user_id = ? AND key LIKE 'pref_notification_%'",
      userId
    );
    const prefs: Record<string, string> = {};
    rows.forEach((r) => {
      prefs[r.key] = r.value;
    });
    return prefs;
  } catch (e) {
    console.error('Failed to get notification preferences:', e);
    return {};
  }
}

/**
 * Dynamic system notification engine.
 * Inspects daily logs, streak states, and cloud synchronicity to generate context-aware warnings.
 */
export async function syncSystemNotifications(
  db: SQLiteDatabase,
  userId: string,
  isSynced: boolean
): Promise<void> {
  if (!userId) return;
  try {
    const prefs = await getNotificationPreferences(db, userId);
    const showStreak = prefs['pref_notification_streak'] !== '0';
    const showSync = prefs['pref_notification_sync'] !== '0';
    const showWorkout = prefs['pref_notification_workout'] !== '0';
    const showMeal = prefs['pref_notification_meal'] !== '0';

    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Clear unread dynamic system alerts before recalculating
    await db.runAsync(
      "DELETE FROM notifications WHERE user_id = ? AND read = 0 AND type IN ('streak', 'sync', 'workout', 'meal')",
      userId
    );

    // 2. Dynamic Streak Warning
    if (showStreak) {
      const streakResult = await calculateActiveLoggingStreak(db, userId);
      const todayLogs = await db.getAllAsync<{ logged_at: string }>(
        `SELECT logged_at FROM meal_logs WHERE user_id = ? AND logged_at = ?
         UNION
         SELECT logged_at FROM workout_logs WHERE user_id = ? AND logged_at = ?`,
        userId,
        todayStr,
        userId,
        todayStr
      );

      const hasLoggedToday = todayLogs.length > 0;

      if (!hasLoggedToday) {
        if (streakResult.isActive) {
          await db.runAsync(
            `INSERT OR IGNORE INTO notifications (id, user_id, type, title, description, read)
             VALUES (?, ?, ?, ?, ?, 0)`,
            `streak-at-risk-${todayStr}`,
            userId,
            'streak',
            'Streak at Risk! 🔥',
            `Your active streak of ${streakResult.streakCount} days is at risk! Log a meal or workout today to keep it burning.`
          );
        } else if (streakResult.streakCount === 1) {
          await db.runAsync(
            `INSERT OR IGNORE INTO notifications (id, user_id, type, title, description, read)
             VALUES (?, ?, ?, ?, ?, 0)`,
            `streak-start-${todayStr}`,
            userId,
            'streak',
            'Start Your Streak! ⚡',
            'You logged yesterday! Log a meal or workout today to officially activate your 2-day consecutive streak.'
          );
        }
      }
    }

    // 3. Dynamic Sync Alert
    if (showSync && !isSynced) {
      await db.runAsync(
        `INSERT OR IGNORE INTO notifications (id, user_id, type, title, description, read)
         VALUES (?, ?, ?, ?, ?, 0)`,
        'sync-offline-warning',
        userId,
        'sync',
        'Cloud Sync Recommended 🛡️',
        'Your logs are currently offline. Enable Cloud Sync in settings to backup your data securely across all devices.'
      );
    }

    // 4. Dynamic Workout Reminder
    if (showWorkout) {
      const todayWorkouts = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM workout_logs WHERE user_id = ? AND logged_at = ?',
        userId,
        todayStr
      );
      if (todayWorkouts.length === 0) {
        await db.runAsync(
          `INSERT OR IGNORE INTO notifications (id, user_id, type, title, description, read)
           VALUES (?, ?, ?, ?, ?, 0)`,
          `workout-reminder-${todayStr}`,
          userId,
          'workout',
          "Log Today's Workout 🏋️‍♂️",
          'Ready to hit your physical goals? Record your latest exercises to stay perfectly on track!'
        );
      }
    }

    // 5. Dynamic Meal Reminder
    if (showMeal) {
      const todayMeals = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM meal_logs WHERE user_id = ? AND logged_at = ?',
        userId,
        todayStr
      );
      if (todayMeals.length === 0) {
        await db.runAsync(
          `INSERT OR IGNORE INTO notifications (id, user_id, type, title, description, read)
           VALUES (?, ?, ?, ?, ?, 0)`,
          `meal-reminder-${todayStr}`,
          userId,
          'meal',
          "Log Today's Meals 🥗",
          'Fuel your fitness journey! Keep your nutrition diary updated by recording your latest meals.'
        );
      }
    }
  } catch (e) {
    console.error('Failed to sync system notifications:', e);
  }
}

export interface WeightLog {
  id: string;
  userId: string;
  weight: number;
  loggedAt: string; // YYYY-MM-DD
  syncedAt?: string;
}

/**
 * Fetches all weight logs for a user ordered by date descending.
 */
export async function fetchWeightLogs(
  db: SQLiteDatabase,
  userId: string
): Promise<WeightLog[]> {
  try {
    const rows = await db.getAllAsync<{
      id: string;
      user_id: string;
      weight: number;
      logged_at: string;
      synced_at: string;
    }>(
      'SELECT id, user_id, weight, logged_at, synced_at FROM weight_logs WHERE user_id = ? ORDER BY logged_at DESC',
      userId
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      weight: r.weight,
      loggedAt: r.logged_at,
      syncedAt: r.synced_at,
    }));
  } catch (e) {
    console.error('Failed to fetch weight logs:', e);
    return [];
  }
}

/**
 * Inserts or updates a body weight log for a calendar date.
 */
export async function logWeightForDate(
  db: SQLiteDatabase,
  userId: string,
  weight: number,
  dateStr: string
): Promise<void> {
  try {
    const id = `weight-${userId}-${dateStr}`;
    await db.runAsync(
      'INSERT OR REPLACE INTO weight_logs (id, user_id, weight, logged_at) VALUES (?, ?, ?, ?)',
      id,
      userId,
      weight,
      dateStr
    );
  } catch (e) {
    console.error('Failed to log weight:', e);
    throw e;
  }
}

/**
 * Deletes a weight log by ID.
 */
export async function deleteWeightLog(
  db: SQLiteDatabase,
  logId: string
): Promise<void> {
  try {
    await db.runAsync('DELETE FROM weight_logs WHERE id = ?', logId);
  } catch (e) {
    console.error('Failed to delete weight log:', e);
    throw e;
  }
}
