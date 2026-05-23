import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MealSection from '@/components/ui/MealSection';
import { spacing } from '@/src/styles/globals';
import { useMeals } from '@/src/context/MealsContext';
import { MealType } from '@/src/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function MealsLogPage() {
  const router = useRouter();
  const { getLogsForMeal, getMealCalories } = useMeals();

  const handleAddFood = (mealType: MealType) => {
    router.push({ pathname: '/add-meal', params: { mealType } });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {MEAL_ORDER.map((mealType) => (
        <MealSection
          key={mealType}
          mealType={mealType}
          logs={getLogsForMeal(mealType)}
          totalCalories={getMealCalories(mealType)}
          onAddFood={() => handleAddFood(mealType)}
          defaultExpanded={true}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
