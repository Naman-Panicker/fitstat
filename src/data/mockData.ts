import { DailyGoals, FoodItem, MealLog } from '../types';

export const DAILY_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 220,
  fat: 65,
  fiber: 30,
};

export const mockFoodLibrary: FoodItem[] = [
  { id: 'f1', name: 'Oatmeal', calories: 307, protein: 11, carbs: 55, fat: 5, fiber: 8 },
  { id: 'f2', name: 'Whole Milk', calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0 },
  { id: 'f3', name: 'Scrambled Eggs (2)', calories: 182, protein: 12, carbs: 2, fat: 14, fiber: 0 },
  { id: 'f4', name: 'Whole Wheat Toast', calories: 128, protein: 5, carbs: 24, fat: 2, fiber: 3 },
  { id: 'f5', name: 'Grilled Chicken Breast', calories: 231, protein: 43, carbs: 0, fat: 5, fiber: 0 },
  { id: 'f6', name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 2, fiber: 4 },
  { id: 'f7', name: 'Steamed Broccoli', calories: 55, protein: 4, carbs: 11, fat: 1, fiber: 4 },
  { id: 'f8', name: 'Salmon Fillet', calories: 367, protein: 39, carbs: 0, fat: 22, fiber: 0 },
  { id: 'f9', name: 'Sweet Potato', calories: 103, protein: 2, carbs: 24, fat: 0, fiber: 4 },
  { id: 'f10', name: 'Greek Yogurt (150g)', calories: 104, protein: 17, carbs: 6, fat: 1, fiber: 0 },
  { id: 'f11', name: 'Almonds (30g)', calories: 174, protein: 6, carbs: 6, fat: 15, fiber: 3 },
  { id: 'f12', name: 'Banana', calories: 89, protein: 1, carbs: 23, fat: 0, fiber: 3 },
  { id: 'f13', name: 'Peanut Butter (1 tbsp)', calories: 94, protein: 4, carbs: 3, fat: 8, fiber: 1 },
  { id: 'f14', name: 'Cottage Cheese (100g)', calories: 98, protein: 11, carbs: 3, fat: 4, fiber: 0 },
  { id: 'f15', name: 'Pasta (cooked, 1 cup)', calories: 220, protein: 8, carbs: 43, fat: 1, fiber: 2 },
];

/** Seed date — the migration seeds these logs with SQLite's date('now') default,
 *  but the in-memory mock still needs a loggedAt for type-safety. */
const SEED_DATE = '2026-01-01';

export const mockDayLog: MealLog[] = [
  { id: 'l1', food: mockFoodLibrary[0], mealType: 'breakfast', servings: 1, loggedAt: SEED_DATE },
  { id: 'l2', food: mockFoodLibrary[1], mealType: 'breakfast', servings: 1, loggedAt: SEED_DATE },
  { id: 'l3', food: mockFoodLibrary[2], mealType: 'breakfast', servings: 1, loggedAt: SEED_DATE },
  { id: 'l4', food: mockFoodLibrary[4], mealType: 'lunch', servings: 1, loggedAt: SEED_DATE },
  { id: 'l5', food: mockFoodLibrary[5], mealType: 'lunch', servings: 1, loggedAt: SEED_DATE },
  { id: 'l6', food: mockFoodLibrary[6], mealType: 'lunch', servings: 1, loggedAt: SEED_DATE },
  { id: 'l7', food: mockFoodLibrary[7], mealType: 'dinner', servings: 1, loggedAt: SEED_DATE },
  { id: 'l8', food: mockFoodLibrary[8], mealType: 'dinner', servings: 1, loggedAt: SEED_DATE },
  { id: 'l9', food: mockFoodLibrary[9], mealType: 'snacks', servings: 1, loggedAt: SEED_DATE },
  { id: 'l10', food: mockFoodLibrary[10], mealType: 'snacks', servings: 1, loggedAt: SEED_DATE },
];
