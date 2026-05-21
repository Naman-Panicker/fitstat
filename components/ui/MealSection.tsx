import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { MealLog, MealType } from '@/src/types';
import FoodItem from './FoodItem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

type Props = {
  mealType: MealType;
  logs: MealLog[];
  totalCalories: number;
  onAddFood: () => void;
  defaultExpanded?: boolean;
};

export default function MealSection({
  mealType,
  logs,
  totalCalories,
  onAddFood,
  defaultExpanded = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.card}>
      {/* Header row */}
      <Pressable
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
        onPress={toggle}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{MEAL_LABELS[mealType]}</Text>
          {logs.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{logs.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalCal}>{totalCalories} kcal</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
            style={styles.chevron}
          />
        </View>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>Nothing logged yet</Text>
          ) : (
            logs.map((log) => <FoodItem key={log.id} log={log} />)
          )}

          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
            onPress={onAddFood}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Food</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.titleSmall,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primaryDim,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  totalCal: {
    ...typography.labelLarge,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  chevron: {
    marginLeft: 2,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  addButtonText: {
    ...typography.labelLarge,
    color: colors.primary,
  },
});
