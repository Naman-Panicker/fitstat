import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/src/styles/globals';
import { MealLog } from '@/src/types';

type Props = {
  log: MealLog;
  onDelete?: (id: string) => void;
};

export default function FoodItem({ log }: Props) {
  const { food, servings } = log;
  const totalCal = Math.round(food.calories * servings);
  const totalProtein = Math.round(food.protein * servings);
  const totalCarbs = Math.round(food.carbs * servings);
  const totalFat = Math.round(food.fat * servings);
  const totalFiber = Math.round((food.fiber || 0) * servings);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{food.name}</Text>
        {servings !== 1 && (
          <Text style={styles.servings}>{servings}x serving</Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.calories}>{totalCal} kcal</Text>
        <Text style={styles.macros}>
          P {totalProtein}g · C {totalCarbs}g · F {totalFat}g · Fi {totalFiber}g
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  right: {
    alignItems: 'flex-end',
  },
  name: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  servings: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  calories: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  macros: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
});
