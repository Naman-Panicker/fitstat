export type FoodItem = {
  id: string;
  userId?: string | null; // NULL = global/shared food item
  name: string;
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  fiber: number;   // grams
  syncedAt?: string | null;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type MealLog = {
  id: string;
  food: FoodItem;
  mealType: MealType;
  servings: number;
  loggedAt: string; // YYYY-MM-DD
  syncedAt?: string | null;
};

export type DailyGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
  syncedAt?: string | null;
};

/** Hard-coded user for the development phase. */
export const DEV_USER_ID = 'dev-user-001';
