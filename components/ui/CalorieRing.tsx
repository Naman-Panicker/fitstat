import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '@/src/styles/globals';
import { PolarChart, Pie } from 'victory-native';

type Props = {
  value: number;     // calories consumed
  goal: number;      // calorie goal
  size?: number;     // outer diameter, default 200
  strokeWidth?: number;
};

/**
 * A state-of-the-art circular progress Donut Chart rendered using Victory Native.
 * Depicts calories consumed vs. remaining calories, with fully responsive centering.
 */
export default function CalorieRing({
  value,
  goal,
  size = 200,
  strokeWidth = 16,
}: Props) {
  const remaining = Math.max(goal - value, 0);
  const clampedPercent = Math.min(value / goal, 1);
  const percentLabel = Math.round(clampedPercent * 100);

  // Victory Native PolarChart expects a clean, colorized dataset.
  // We use very small non-zero values to ensure beautiful rendering boundaries when counts are 0.
  const pieData = [
    { label: 'Consumed', value: value > 0 ? value : 0.1, color: colors.primary },
    { label: 'Remaining', value: remaining > 0 ? remaining : 0.001, color: 'rgba(255, 255, 255, 0.08)' },
  ];

  // We convert the thickness value dynamically to an inner radius percentage
  const innerRadiusPct = `${Math.round(100 - (strokeWidth / (size / 2)) * 100)}%`;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <PolarChart
        data={pieData}
        labelKey="label"
        valueKey="value"
        colorKey="color"
      >
        <Pie.Chart innerRadius={innerRadiusPct as any} />
      </PolarChart>

      {/* Center Content positioned absolutely inside the Donut hole */}
      <View style={styles.inner}>
        <Text style={styles.valueText}>{value.toLocaleString()}</Text>
        <Text style={styles.labelText}>kcal consumed</Text>
        <Text style={styles.remainingText}>{remaining.toLocaleString()} remaining</Text>
        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{percentLabel}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  inner: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    width: '76%',
    height: '76%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  valueText: {
    ...typography.displayLarge,
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  labelText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 9,
    marginTop: 2,
  },
  remainingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  percentBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  percentText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 9,
  },
});
