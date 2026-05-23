import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { FoodItem, MealLog, MealType, DEV_USER_ID } from '../types';
import {
  getAllFoodItems,
  getMealLogsByDate,
  insertFoodItem,
  insertMealLog,
  deleteMealLog,
} from '../db/queries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD. */
function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── State ────────────────────────────────────────────────────────────────────

type State = {
  foodLibrary: FoodItem[];
  dayLog: MealLog[];
  selectedDate: string; // YYYY-MM-DD
  isLoaded: boolean;
};

const initialState: State = {
  foodLibrary: [],
  dayLog: [],
  selectedDate: todayDateString(),
  isLoaded: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'HYDRATE'; payload: { foodLibrary: FoodItem[]; dayLog: MealLog[] } }
  | { type: 'ADD_FOOD_TO_LIBRARY'; payload: FoodItem }
  | { type: 'LOG_MEAL'; payload: MealLog }
  | { type: 'DELETE_LOG_ENTRY'; payload: { id: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoaded: true };
    case 'ADD_FOOD_TO_LIBRARY': {
      const exists = state.foodLibrary.some(
        (f) => f.name.toLowerCase() === action.payload.name.toLowerCase()
      );
      if (exists) return state;
      return { ...state, foodLibrary: [action.payload, ...state.foodLibrary] };
    }
    case 'LOG_MEAL':
      return { ...state, dayLog: [...state.dayLog, action.payload] };
    case 'DELETE_LOG_ENTRY':
      return {
        ...state,
        dayLog: state.dayLog.filter((l) => l.id !== action.payload.id),
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = State & {
  addFoodToLibrary: (food: FoodItem) => void;
  logMeal: (log: MealLog) => void;
  deleteLogEntry: (id: string) => void;
  getLogsForMeal: (mealType: MealType) => MealLog[];
  getMealCalories: (mealType: MealType) => number;
  getTotals: () => { calories: number; protein: number; carbs: number; fat: number; fiber: number };
};

const MealsContext = createContext<ContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MealsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from SQLite on mount
  useEffect(() => {
    async function hydrate() {
      try {
        const date = todayDateString();
        const [foodLibrary, dayLog] = await Promise.all([
          getAllFoodItems(db, DEV_USER_ID),
          getMealLogsByDate(db, DEV_USER_ID, date),
        ]);
        dispatch({ type: 'HYDRATE', payload: { foodLibrary, dayLog } });
      } catch (e) {
        console.error('SQLite hydration failed:', e);
        dispatch({ type: 'HYDRATE', payload: { foodLibrary: [], dayLog: [] } });
      }
    }
    hydrate();
  }, [db]);

  const addFoodToLibrary = (food: FoodItem) => {
    const exists = state.foodLibrary.some(
      (f) => f.name.toLowerCase() === food.name.toLowerCase()
    );
    if (exists) return;

    // Write to SQLite, then update in-memory state
    insertFoodItem(db, food, DEV_USER_ID).catch((e) =>
      console.error('Failed to insert food item:', e)
    );
    dispatch({ type: 'ADD_FOOD_TO_LIBRARY', payload: food });
  };

  const logMeal = (log: MealLog) => {
    insertMealLog(db, log, DEV_USER_ID, state.selectedDate).catch((e) =>
      console.error('Failed to insert meal log:', e)
    );
    dispatch({ type: 'LOG_MEAL', payload: log });
  };

  const deleteLogEntry = (id: string) => {
    deleteMealLog(db, id).catch((e) =>
      console.error('Failed to delete meal log:', e)
    );
    dispatch({ type: 'DELETE_LOG_ENTRY', payload: { id } });
  };

  const getLogsForMeal = (mealType: MealType) =>
    state.dayLog.filter((l) => l.mealType === mealType);

  const getMealCalories = (mealType: MealType) =>
    getLogsForMeal(mealType).reduce(
      (sum, l) => sum + l.food.calories * l.servings,
      0
    );

  const getTotals = () =>
    state.dayLog.reduce(
      (acc, l) => ({
        calories: acc.calories + l.food.calories * (l.servings || 0),
        protein: acc.protein + l.food.protein * (l.servings || 0),
        carbs: acc.carbs + l.food.carbs * (l.servings || 0),
        fat: acc.fat + l.food.fat * (l.servings || 0),
        fiber: acc.fiber + (l.food.fiber || 0) * (l.servings || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

  return (
    <MealsContext.Provider
      value={{
        ...state,
        addFoodToLibrary,
        logMeal,
        deleteLogEntry,
        getLogsForMeal,
        getMealCalories,
        getTotals,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMeals(): ContextValue {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within a MealsProvider');
  return ctx;
}
