import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '@/components/HomeHeader';
import CalorieRing from '@/components/ui/CalorieRing';
import MacroBar from '@/components/ui/MacroBar';
import { colors, globalStyles, radius, spacing, typography } from '@/src/styles/globals';
import { useMeals } from '@/src/context/MealsContext';
import { DAILY_GOALS } from '@/src/data/mockData';
import { MealType } from '@/src/types';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export default function HomeScreen() {
  const router = useRouter();
  const { getMealCalories, getTotals } = useMeals();
  const totals = getTotals();

  const handleAddMeal = (mealType?: MealType) => {
    router.push({ pathname: '/add-meal', params: mealType ? { mealType } : {} });
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* Brand Top Bar */}
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.headerTitleRow, pressed && { opacity: 0.7 }]}>
          <Text style={styles.headerTitle}>Home</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[globalStyles.scrollContent, { paddingTop: spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />

        {/* Calorie Ring Card */}
        <View style={styles.ringCard}>
          <CalorieRing
            value={totals.calories}
            goal={DAILY_GOALS.calories}
            size={200}
            strokeWidth={18}
          />

          {/* Macro Progress Bars */}
          <View style={styles.macroBarsContainer}>
            <MacroBar
              label="Protein"
              value={totals.protein}
              goal={DAILY_GOALS.protein}
              color={colors.proteinColor}
              noMargin
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs}
              goal={DAILY_GOALS.carbs}
              color={colors.carbColor}
              noMargin
            />
            <MacroBar
              label="Fat"
              value={totals.fat}
              goal={DAILY_GOALS.fat}
              color={colors.fatColor}
              noMargin
            />
            <MacroBar
              label="Fiber"
              value={totals.fiber}
              goal={DAILY_GOALS.fiber}
              color={colors.fiberColor}
              noMargin
            />
          </View>
        </View>

        {/* Today's Meals Summary */}
        <Text style={globalStyles.sectionTitle}>Today's Meals</Text>

        {MEAL_ORDER.map((mealType) => {
          const cal = getMealCalories(mealType);
          return (
            <View key={mealType} style={styles.mealRow}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealLabel}>{MEAL_LABELS[mealType]}</Text>
                <Text style={styles.mealCal}>
                  {cal > 0 ? `${cal} kcal` : 'Not logged'}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                onPress={() => handleAddMeal(mealType)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ringCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chevronIcon: {
    marginTop: 4,
  },
  macroBarsContainer: {
    width: '100%',
    gap: spacing.xs,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  mealLeft: {
    gap: 2,
  },
  mealLabel: {
    ...typography.titleSmall,
    color: colors.text,
  },
  mealCal: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  addBtnText: {
    ...typography.labelLarge,
    color: colors.primary,
  },
});
