import { type SQLiteDatabase } from 'expo-sqlite';
import { mockFoodLibrary, mockDayLog } from '../data/mockData';
import { DEV_USER_ID } from '../types';

const DATABASE_VERSION = 2;

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

  // Future migrations:
  // if (currentDbVersion === 2) { ... currentDbVersion = 3; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
