import { type SQLiteDatabase } from 'expo-sqlite';
import { STANDARD_FOOD_LIBRARY } from '../data/mockData';

const DATABASE_VERSION = 11;

/**
 * Generates a local UUID-like identifier for offline users.
 */
function generateLocalUserId(): string {
  const seg = () => Math.random().toString(36).slice(2, 8);
  return `local-${seg()}-${seg()}-${Date.now().toString(36)}`;
}

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

  // ── v0 → v1: Full production schema + reference data (fresh installs) ─────
  if (currentDbVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY NOT NULL,
        username   TEXT UNIQUE,
        name       TEXT NOT NULL,
        email      TEXT,
        number     TEXT,
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

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT NOT NULL,
        key     TEXT NOT NULL,
        value   TEXT NOT NULL,
        PRIMARY KEY (user_id, key)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id          TEXT PRIMARY KEY NOT NULL,
        user_id     TEXT NOT NULL,
        type        TEXT NOT NULL,
        title       TEXT NOT NULL,
        description TEXT NOT NULL,
        read        INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id         TEXT PRIMARY KEY NOT NULL,
        user_id    TEXT NOT NULL,
        weight     REAL NOT NULL,
        logged_at  TEXT NOT NULL,
        synced_at  TEXT,
        UNIQUE(user_id, logged_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // ── Seed standard food library (global, user_id = NULL) ─────────────────
    for (const food of STANDARD_FOOD_LIBRARY) {
      await db.runAsync(
        'INSERT OR IGNORE INTO food_items (id, user_id, name, calories, protein, carbs, fat, fiber) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)',
        food.id,
        food.name,
        food.calories,
        food.protein,
        food.carbs,
        food.fat,
        food.fiber
      );
    }

    // ── Seed standard exercises (global, user_id = NULL) ────────────────────
    const standardExercises: { id: string; name: string; muscle: string }[] = [
      { id: 'e1', name: 'Crunch', muscle: 'abs' },
      { id: 'e2', name: 'Plank', muscle: 'abs' },
      { id: 'e3', name: 'Hanging Leg Raise', muscle: 'abs' },
      { id: 'e4', name: 'Barbell Row', muscle: 'back' },
      { id: 'e5', name: 'Pull-up', muscle: 'back' },
      { id: 'e6', name: 'Lat Pulldown', muscle: 'back' },
      { id: 'e7', name: 'Barbell Curl', muscle: 'biceps' },
      { id: 'e8', name: 'Hammer Curl', muscle: 'biceps' },
      { id: 'e9', name: 'Incline Dumbbell Curl', muscle: 'biceps' },
      { id: 'e10', name: 'Treadmill Run', muscle: 'cardio' },
      { id: 'e11', name: 'Stationary Bike', muscle: 'cardio' },
      { id: 'e12', name: 'Jump Rope', muscle: 'cardio' },
      { id: 'e13', name: 'Flat Barbell Bench Press', muscle: 'chest' },
      { id: 'e14', name: 'Incline Dumbbell Press', muscle: 'chest' },
      { id: 'e15', name: 'Chest Fly', muscle: 'chest' },
      { id: 'e16', name: 'Wrist Curl', muscle: 'forearms' },
      { id: 'e17', name: 'Reverse Wrist Curl', muscle: 'forearms' },
      { id: 'e18', name: 'Barbell Squat', muscle: 'legs' },
      { id: 'e19', name: 'Romanian Deadlift', muscle: 'legs' },
      { id: 'e20', name: 'Leg Press', muscle: 'legs' },
      { id: 'e21', name: 'Calf Raise', muscle: 'legs' },
      { id: 'e22', name: 'Overhead Barbell Press', muscle: 'shoulders' },
      { id: 'e23', name: 'Lateral Dumbbell Raise', muscle: 'shoulders' },
      { id: 'e24', name: 'Rear Delt Fly', muscle: 'shoulders' },
      { id: 'e25', name: 'Skull Crusher', muscle: 'triceps' },
      { id: 'e26', name: 'Cable Pushdown', muscle: 'triceps' },
      { id: 'e27', name: 'Overhead Dumbbell Extension', muscle: 'triceps' },
    ];

    for (const ex of standardExercises) {
      await db.runAsync(
        'INSERT OR IGNORE INTO exercises (id, user_id, name, muscle_group) VALUES (?, NULL, ?, ?)',
        ex.id,
        ex.name,
        ex.muscle
      );
    }

    currentDbVersion = 1;
  }

  // ── v1–v10 → v11: Migration for old dev databases ────────────────────────
  // Handles existing dev installs that were on the old incremental migration chain.
  // Rebuilds user_preferences with user_id scoping, cleans up test data,
  // and ensures weight_logs has proper UNIQUE(user_id, logged_at).
  if (currentDbVersion >= 1 && currentDbVersion <= 10) {
    try {
      // 1. Rebuild user_preferences with user_id scoping
      const existingPrefs = await db.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM user_preferences'
      ).catch(() => [] as { key: string; value: string }[]);

      await db.execAsync(`
        DROP TABLE IF EXISTS user_preferences;
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id TEXT NOT NULL,
          key     TEXT NOT NULL,
          value   TEXT NOT NULL,
          PRIMARY KEY (user_id, key)
        );
      `);

      // Re-insert existing preferences scoped to the current user
      const userRow = await db.getFirstAsync<{ id: string }>('SELECT id FROM users LIMIT 1');
      const currentUserId = userRow?.id ?? '';
      if (currentUserId && existingPrefs.length > 0) {
        for (const pref of existingPrefs) {
          await db.runAsync(
            'INSERT OR IGNORE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)',
            currentUserId,
            pref.key,
            pref.value
          );
        }
      }

      // 2. Rebuild weight_logs to have proper UNIQUE(user_id, logged_at) constraint
      const hasWeightLogs = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='weight_logs'"
      );

      if (hasWeightLogs) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS weight_logs_new (
            id         TEXT PRIMARY KEY NOT NULL,
            user_id    TEXT NOT NULL,
            weight     REAL NOT NULL,
            logged_at  TEXT NOT NULL,
            synced_at  TEXT,
            UNIQUE(user_id, logged_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          INSERT OR IGNORE INTO weight_logs_new SELECT id, user_id, weight, logged_at, synced_at FROM weight_logs;
          DROP TABLE weight_logs;
          ALTER TABLE weight_logs_new RENAME TO weight_logs;
        `);
      } else {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS weight_logs (
            id         TEXT PRIMARY KEY NOT NULL,
            user_id    TEXT NOT NULL,
            weight     REAL NOT NULL,
            logged_at  TEXT NOT NULL,
            synced_at  TEXT,
            UNIQUE(user_id, logged_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `);
      }

      // 3. Ensure notifications table exists (for dev installs that missed v9)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notifications (
          id          TEXT PRIMARY KEY NOT NULL,
          user_id     TEXT NOT NULL,
          type        TEXT NOT NULL,
          title       TEXT NOT NULL,
          description TEXT NOT NULL,
          read        INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 4. Ensure username column exists on users table
      const tableInfo = await db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(users)'
      );
      const hasUsername = tableInfo.some((col) => col.name === 'username');
      if (!hasUsername) {
        await db.execAsync('ALTER TABLE users ADD COLUMN username TEXT;');
      }

      // 5. Clean up all test/dev meal logs and workout logs
      await db.execAsync(`
        DELETE FROM exercise_sets WHERE id LIKE 'hist-%';
        DELETE FROM workout_logs WHERE id LIKE 'hist-%';
        DELETE FROM meal_logs WHERE id LIKE 'hist-%';
        DELETE FROM meal_logs WHERE id LIKE 'l%' AND user_id = 'dev-user-001';
      `);

      // 6. Ensure standard food items exist as global (user_id = NULL)
      for (const food of STANDARD_FOOD_LIBRARY) {
        await db.runAsync(
          'INSERT OR IGNORE INTO food_items (id, user_id, name, calories, protein, carbs, fat, fiber) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)',
          food.id,
          food.name,
          food.calories,
          food.protein,
          food.carbs,
          food.fat,
          food.fiber
        );
      }

    } catch (e) {
      console.error('Failed to run v10→v11 cleanup migration:', e);
    }

    currentDbVersion = 11;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/**
 * Retrieves the currently stored user ID in the local SQLite database.
 * If no user exists (fresh install), creates one with a generated local UUID.
 */
export async function getLocalUserId(db: SQLiteDatabase): Promise<string> {
  try {
    // Purge any residual developer user data from previous testing runs
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM users WHERE id = 'dev-user-001';
      DELETE FROM meal_logs WHERE user_id = 'dev-user-001';
      DELETE FROM workout_logs WHERE user_id = 'dev-user-001';
      DELETE FROM weight_logs WHERE user_id = 'dev-user-001';
      DELETE FROM notifications WHERE user_id = 'dev-user-001';
      DELETE FROM user_preferences WHERE user_id = 'dev-user-001';
      PRAGMA foreign_keys = ON;
    `);

    const row = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM users LIMIT 1'
    );

    if (row?.id) return row.id;

    // Fresh install — create a local offline user
    const localId = generateLocalUserId();
    try {
      await db.runAsync(
        'INSERT INTO users (id, username, name, email) VALUES (?, ?, ?, ?)',
        localId,
        '@user',
        'FitStat User',
        null
      );

      // Seed default preferences for this new user
      const defaultPrefs = [
        ['workout_unit', 'metric'],
        ['weight_target', '75.0'],
        ['weight_unit', 'kg'],
        ['calorie_goal', '2000'],
        ['pref_notification_streak', '1'],
        ['pref_notification_sync', '1'],
        ['pref_notification_workout', '1'],
        ['pref_notification_meal', '1'],
      ];
      for (const [key, value] of defaultPrefs) {
        await db.runAsync(
          'INSERT OR IGNORE INTO user_preferences (user_id, key, value) VALUES (?, ?, ?)',
          localId,
          key,
          value
        );
      }

      return localId;
    } catch (insertError: any) {
      // If insertion fails due to UNIQUE constraint, query and return the existing user ID
      const existingRow = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users LIMIT 1'
      );
      if (existingRow?.id) {
        return existingRow.id;
      }
      throw insertError;
    }
  } catch (e) {
    console.error('Failed to get/create local user ID:', e);
    return generateLocalUserId();
  }
}

/**
 * Migrates a local offline user ID to a newly authenticated real user UUID.
 * Disables foreign keys, performs atomic updates on users and child tables, then re-enables foreign keys.
 */
export async function migrateLocalUserId(
  db: SQLiteDatabase,
  oldId: string,
  newId: string
): Promise<void> {
  if (!oldId || !newId || oldId === newId) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync('PRAGMA foreign_keys = OFF;');

    try {
      const userExists = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users WHERE id = ?',
        oldId
      );

      if (userExists) {
        await db.runAsync('UPDATE users SET id = ? WHERE id = ?', newId, oldId);
        await db.runAsync('UPDATE food_items SET user_id = ? WHERE user_id = ?', newId, oldId);
        await db.runAsync('UPDATE meal_logs SET user_id = ? WHERE user_id = ?', newId, oldId);
        await db.runAsync('UPDATE exercises SET user_id = ? WHERE user_id = ?', newId, oldId);
        await db.runAsync('UPDATE workout_logs SET user_id = ? WHERE user_id = ?', newId, oldId);
        await db.runAsync('UPDATE weight_logs SET user_id = ? WHERE user_id = ?', newId, oldId);
        await db.runAsync('UPDATE notifications SET user_id = ? WHERE user_id = ?', newId, oldId);
        await db.runAsync('UPDATE user_preferences SET user_id = ? WHERE user_id = ?', newId, oldId);
      }
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  });
}
