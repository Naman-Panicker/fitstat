import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
} from 'react';
import { mockDayLog, mockFoodLibrary } from '../data/mockData';
import { FoodItem, MealLog, MealType } from '../types';

// ─── State ────────────────────────────────────────────────────────────────────

type State = {
  foodLibrary: FoodItem[];
  dayLog: MealLog[];
};

const initialState: State = {
  foodLibrary: mockFoodLibrary,
  dayLog: mockDayLog,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_FOOD_TO_LIBRARY'; payload: FoodItem }
  | { type: 'LOG_MEAL'; payload: MealLog }
  | { type: 'DELETE_LOG_ENTRY'; payload: { id: string } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
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
  const [state, dispatch] = useReducer(reducer, initialState);

  const addFoodToLibrary = (food: FoodItem) =>
    dispatch({ type: 'ADD_FOOD_TO_LIBRARY', payload: food });

  const logMeal = (log: MealLog) =>
    dispatch({ type: 'LOG_MEAL', payload: log });

  const deleteLogEntry = (id: string) =>
    dispatch({ type: 'DELETE_LOG_ENTRY', payload: { id } });

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
