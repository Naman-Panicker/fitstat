import { type SQLiteDatabase } from 'expo-sqlite';
import { mockFoodLibrary, mockDayLog } from '../data/mockData';
import { DEV_USER_ID } from '../types';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) return;

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY NOT NULL,
        name       TEXT NOT NULL,
        email      TEXT,
        avatar_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS food_items (
        id       TEXT PRIMARY KEY NOT NULL,
        user_id  TEXT NOT NULL,
        name     TEXT NOT NULL,
        calories REAL NOT NULL DEFAULT 0,
        protein  REAL NOT NULL DEFAULT 0,
        carbs    REAL NOT NULL DEFAULT 0,
        fat      REAL NOT NULL DEFAULT 0,
        fiber    REAL NOT NULL DEFAULT 0,
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
        logged_at TEXT NOT NULL DEFAULT (date('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
        ON meal_logs (user_id, logged_at);
    `);

    // ── Seed dev user ──────────────────────────────────────────────────────
    await db.runAsync(
      'INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)',
      DEV_USER_ID,
      'Dev Tester',
      'dev@fitstat.local'
    );

    // ── Seed food library ──────────────────────────────────────────────────
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

    // ── Seed day log ───────────────────────────────────────────────────────
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

    currentDbVersion = 1;
  }

  // Future migrations:
  // if (currentDbVersion === 1) { ... currentDbVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
