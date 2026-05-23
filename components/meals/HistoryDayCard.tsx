import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MealSection from '@/components/ui/MealSection';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { MealType } from '@/src/types';
import { DaySummary } from '@/src/db/queries';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

type Props = {
  day: DaySummary;
};

export default function HistoryDayCard({ day }: Props) {
  // Group logs by meal type
  const logsByMeal = (mealType: MealType) =>
    day.meals.filter((m) => m.mealType === mealType);

  const caloriesByMeal = (mealType: MealType) =>
    logsByMeal(mealType).reduce(
      (sum, m) => sum + Math.round(m.food.calories * m.servings),
      0
    );

  // Only render meal sections that have at least one log
  const activeMeals = MEAL_ORDER.filter(
    (mt) => logsByMeal(mt).length > 0
  );

  return (
    <View style={styles.card}>
      {/* Day header */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{day.dayLabel}</Text>
        <Text style={styles.dayCalories}>{day.totalCalories} kcal</Text>
      </View>

      {/* Meal sections — collapsed, read-only */}
      {activeMeals.map((mealType) => (
        <MealSection
          key={mealType}
          mealType={mealType}
          logs={logsByMeal(mealType)}
          totalCalories={caloriesByMeal(mealType)}
          defaultExpanded={false}
          showAddButton={false}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  dayLabel: {
    ...typography.titleMedium,
    color: colors.text,
  },
  dayCalories: {
    ...typography.labelLarge,
    color: colors.primary,
  },
});
