import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
        <Image
          source={require('../../assets/images/Gemini_Generated_Image_vzkyh1vzkyh1vzky.png')}
          style={styles.appIcon}
          resizeMode="cover"
        />
        <Text style={styles.brandName}>FitStat</Text>
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
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleAddMeal(mealType)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleAddMeal()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.background} />
      </TouchableOpacity>
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
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  brandName: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
