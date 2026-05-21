import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/src/styles/globals';

type Props = {
  label: string;
  value: number;    // consumed (grams or kcal)
  goal: number;
  color: string;
  unit?: string;    // default 'g'
  noMargin?: boolean;
};

export default function MacroBar({ label, value, goal, color, unit = 'g', noMargin = false }: Props) {
  const percent = Math.min(value / goal, 1);

  return (
    <View style={[styles.wrapper, noMargin && { marginBottom: 0 }]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          <Text style={[styles.consumed, { color }]}>{Math.round(value)}</Text>
          <Text style={styles.goal}> / {goal}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percent * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.labelLarge,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  values: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  consumed: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  goal: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
