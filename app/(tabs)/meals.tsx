import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MealSection from '@/components/ui/MealSection';
import { colors, globalStyles, spacing, typography } from '@/src/styles/globals';
import { useMeals } from '@/src/context/MealsContext';
import { MealType } from '@/src/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function MealsScreen() {
  const router = useRouter();
  const { getLogsForMeal, getMealCalories } = useMeals();

  const handleAddFood = (mealType: MealType) => {
    router.push({ pathname: '/add-meal', params: { mealType } });
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView
        contentContainerStyle={globalStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Meal Log</Text>

        {/* Meal Sections */}
        {MEAL_ORDER.map((mealType) => (
          <MealSection
            key={mealType}
            mealType={mealType}
            logs={getLogsForMeal(mealType)}
            totalCalories={getMealCalories(mealType)}
            onAddFood={() => handleAddFood(mealType)}
            defaultExpanded={mealType === 'breakfast' || mealType === 'lunch'}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    ...typography.displayMedium,
    color: colors.text,
    marginBottom: spacing.lg,
  },
});
