import { type SQLiteDatabase } from 'expo-sqlite';
import { mockFoodLibrary, mockDayLog } from '../data/mockData';
import { DEV_USER_ID } from '../types';

const DATABASE_VERSION = 5;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // ── Always-on pragmas (must run every connection, not just migrations) ─────
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) return;

  // ── v0 → v1: initial schema + seed data ───────────────────────────────────
  if (currentDbVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY NOT NULL,
        name       TEXT NOT NULL,
        email      TEXT,
        avatar_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at  TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_user ON users((1));

      CREATE TABLE IF NOT EXISTS food_items (
        id       TEXT PRIMARY KEY NOT NULL,
        user_id  TEXT,
        name     TEXT NOT NULL,
        calories REAL NOT NULL DEFAULT 0,
        protein  REAL NOT NULL DEFAULT 0,
        carbs    REAL NOT NULL DEFAULT 0,
        fat      REAL NOT NULL DEFAULT 0,
        fiber    REAL NOT NULL DEFAULT 0,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_food_items_user_name
        ON food_items (user_id, name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS meal_logs (
        id        TEXT PRIMARY KEY NOT NULL,
        user_id   TEXT NOT NULL,
        food_id   TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snacks')),
        servings  REAL NOT NULL DEFAULT 1,
        logged_at TEXT NOT NULL DEFAULT (date('now'))
                  CHECK (logged_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
        ON meal_logs (user_id, logged_at);
    `);

    // ── Seed dev user ────────────────────────────────────────────────────────
    await db.runAsync(
      'INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)',
      DEV_USER_ID,
      'Dev Tester',
      'dev@fitstat.local'
    );

    // ── Seed food library ────────────────────────────────────────────────────
    for (const food of mockFoodLibrary) {
      await db.runAsync(
        'INSERT OR IGNORE INTO food_items (id, user_id, name, calories, protein, carbs, fat, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        food.id,
        DEV_USER_ID,
        food.name,
        food.calories,
        food.protein,
        food.carbs,
        food.fat,
        food.fiber
      );
    }

    // ── Seed day log ─────────────────────────────────────────────────────────
    for (const log of mockDayLog) {
      await db.runAsync(
        'INSERT OR IGNORE INTO meal_logs (id, user_id, food_id, meal_type, servings) VALUES (?, ?, ?, ?, ?)',
        log.id,
        DEV_USER_ID,
        log.food.id,
        log.mealType,
        log.servings
      );
    }

    currentDbVersion = 2;
  }

  // ── v1 → v2: add synced_at, one_user index, nullable user_id, logged_at CHECK
  if (currentDbVersion === 1) {
    // -- users: add synced_at + one_user index
    await db.execAsync(`
      ALTER TABLE users ADD COLUMN synced_at TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS one_user ON users((1));
    `);

    // -- food_items: add synced_at, then recreate to make user_id nullable
    await db.execAsync(`
      ALTER TABLE food_items ADD COLUMN synced_at TEXT;

      CREATE TABLE food_items_new (
        id        TEXT PRIMARY KEY NOT NULL,
        user_id   TEXT,
        name      TEXT NOT NULL,
        calories  REAL NOT NULL DEFAULT 0,
        protein   REAL NOT NULL DEFAULT 0,
        carbs     REAL NOT NULL DEFAULT 0,
        fat       REAL NOT NULL DEFAULT 0,
        fiber     REAL NOT NULL DEFAULT 0,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      INSERT INTO food_items_new SELECT id, user_id, name, calories, protein, carbs, fat, fiber, synced_at FROM food_items;
      DROP TABLE food_items;
      ALTER TABLE food_items_new RENAME TO food_items;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_food_items_user_name
        ON food_items (user_id, name COLLATE NOCASE);
    `);

    // -- meal_logs: add synced_at, then recreate to add CHECK constraint on logged_at
    await db.execAsync(`
      ALTER TABLE meal_logs ADD COLUMN synced_at TEXT;

      CREATE TABLE meal_logs_new (
        id        TEXT PRIMARY KEY NOT NULL,
        user_id   TEXT NOT NULL,
        food_id   TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snacks')),
        servings  REAL NOT NULL DEFAULT 1,
        logged_at TEXT NOT NULL DEFAULT (date('now'))
                  CHECK (logged_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE
      );

      INSERT INTO meal_logs_new SELECT id, user_id, food_id, meal_type, servings, logged_at, synced_at FROM meal_logs;
      DROP TABLE meal_logs;
      ALTER TABLE meal_logs_new RENAME TO meal_logs;

      CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
        ON meal_logs (user_id, logged_at);
    `);

    currentDbVersion = 2;
  }

  // ── v2 → v3: seed historical meal logs for testing ──────────────────────────
  if (currentDbVersion === 2) {
    // Helper: YYYY-MM-DD for N days ago
    const daysAgo = (n: number): string => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Breakfast/lunch/dinner/snack food combos using existing seed food IDs
    const mealPlans: { meal_type: string; food_ids: string[] }[][] = [
      // Pattern A
      [
        { meal_type: 'breakfast', food_ids: ['f1', 'f2'] },
        { meal_type: 'lunch',     food_ids: ['f5', 'f6', 'f7'] },
        { meal_type: 'dinner',    food_ids: ['f8', 'f9'] },
        { meal_type: 'snacks',    food_ids: ['f10'] },
      ],
      // Pattern B
      [
        { meal_type: 'breakfast', food_ids: ['f3', 'f4', 'f2'] },
        { meal_type: 'lunch',     food_ids: ['f5', 'f15'] },
        { meal_type: 'dinner',    food_ids: ['f8', 'f7', 'f9'] },
        { meal_type: 'snacks',    food_ids: ['f11', 'f12'] },
      ],
      // Pattern C
      [
        { meal_type: 'breakfast', food_ids: ['f1', 'f13', 'f12'] },
        { meal_type: 'lunch',     food_ids: ['f5', 'f6'] },
        { meal_type: 'dinner',    food_ids: ['f15', 'f7'] },
        { meal_type: 'snacks',    food_ids: ['f14', 'f11'] },
      ],
    ];

    // Seed 10 past days (1..10 days ago)
    for (let day = 1; day <= 10; day++) {
      const date = daysAgo(day);
      const plan = mealPlans[day % mealPlans.length];
      for (const slot of plan) {
        for (let fi = 0; fi < slot.food_ids.length; fi++) {
          const logId = `hist-d${day}-${slot.meal_type}-${fi}`;
          await db.runAsync(
            'INSERT OR IGNORE INTO meal_logs (id, user_id, food_id, meal_type, servings, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
            logId,
            DEV_USER_ID,
            slot.food_ids[fi],
            slot.meal_type,
            1,
            date
          );
        }
      }
    }

    currentDbVersion = 3;
  }

  // ── v3 → v4: Add Workouts schema & seed standard exercises ──────────────────
  if (currentDbVersion === 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id           TEXT PRIMARY KEY NOT NULL,
        user_id      TEXT,
        name         TEXT NOT NULL,
        muscle_group TEXT NOT NULL CHECK (muscle_group IN ('abs','back','biceps','cardio','chest','forearms','legs','shoulders','triceps')),
        synced_at    TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_user_name
        ON exercises (user_id, name COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS workout_logs (
        id        TEXT PRIMARY KEY NOT NULL,
        user_id   TEXT NOT NULL,
        logged_at TEXT NOT NULL DEFAULT (date('now'))
                  CHECK (logged_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_logs_user_date
        ON workout_logs (user_id, logged_at);

      CREATE TABLE IF NOT EXISTS exercise_sets (
        id             TEXT PRIMARY KEY NOT NULL,
        workout_log_id TEXT NOT NULL,
        exercise_id    TEXT NOT NULL,
        weight         REAL NOT NULL DEFAULT 0,
        reps           INTEGER NOT NULL DEFAULT 0,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at      TEXT,
        FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_log
        ON exercise_sets (workout_log_id);
    `);

    // Standard preloaded exercises to seed
    const defaultExercises: { id: string; name: string; muscle: string }[] = [
      // Abs
      { id: 'e1', name: 'Crunch', muscle: 'abs' },
      { id: 'e2', name: 'Plank', muscle: 'abs' },
      { id: 'e3', name: 'Hanging Leg Raise', muscle: 'abs' },
      // Back
      { id: 'e4', name: 'Barbell Row', muscle: 'back' },
      { id: 'e5', name: 'Pull-up', muscle: 'back' },
      { id: 'e6', name: 'Lat Pulldown', muscle: 'back' },
      // Biceps
      { id: 'e7', name: 'Barbell Curl', muscle: 'biceps' },
      { id: 'e8', name: 'Hammer Curl', muscle: 'biceps' },
      { id: 'e9', name: 'Incline Dumbbell Curl', muscle: 'biceps' },
      // Cardio
      { id: 'e10', name: 'Treadmill Run', muscle: 'cardio' },
      { id: 'e11', name: 'Stationary Bike', muscle: 'cardio' },
      { id: 'e12', name: 'Jump Rope', muscle: 'cardio' },
      // Chest
      { id: 'e13', name: 'Flat Barbell Bench Press', muscle: 'chest' },
      { id: 'e14', name: 'Incline Dumbbell Press', muscle: 'chest' },
      { id: 'e15', name: 'Chest Fly', muscle: 'chest' },
      // Forearms
      { id: 'e16', name: 'Wrist Curl', muscle: 'forearms' },
      { id: 'e17', name: 'Reverse Wrist Curl', muscle: 'forearms' },
      // Legs
      { id: 'e18', name: 'Barbell Squat', muscle: 'legs' },
      { id: 'e19', name: 'Romanian Deadlift', muscle: 'legs' },
      { id: 'e20', name: 'Leg Press', muscle: 'legs' },
      { id: 'e21', name: 'Calf Raise', muscle: 'legs' },
      // Shoulders
      { id: 'e22', name: 'Overhead Barbell Press', muscle: 'shoulders' },
      { id: 'e23', name: 'Lateral Dumbbell Raise', muscle: 'shoulders' },
      { id: 'e24', name: 'Rear Delt Fly', muscle: 'shoulders' },
      // Triceps
      { id: 'e25', name: 'Skull Crusher', muscle: 'triceps' },
      { id: 'e26', name: 'Cable Pushdown', muscle: 'triceps' },
      { id: 'e27', name: 'Overhead Dumbbell Extension', muscle: 'triceps' },
    ];

    for (const ex of defaultExercises) {
      await db.runAsync(
        'INSERT OR IGNORE INTO exercises (id, user_id, name, muscle_group) VALUES (?, NULL, ?, ?)',
        ex.id,
        ex.name,
        ex.muscle
      );
    }

    currentDbVersion = 4;
  }

  // Migrate v4 -> v5: Add user preferences table
  if (currentDbVersion === 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      INSERT OR IGNORE INTO user_preferences (key, value) VALUES ('workout_unit', 'metric');
    `);
    currentDbVersion = 5;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
