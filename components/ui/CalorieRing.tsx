import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '@/src/styles/globals';

type Props = {
  value: number;     // calories consumed
  goal: number;      // calorie goal
  size?: number;     // outer diameter, default 200
  strokeWidth?: number;
};

/**
 * A circular progress ring built with pure React Native Views.
 * Uses a clip-based half-ring technique: two semicircle masks
 * are rotated to form a filled arc proportional to value/goal.
 */
export default function CalorieRing({
  value,
  goal,
  size = 200,
  strokeWidth = 16,
}: Props) {
  const clampedPercent = Math.min(value / goal, 1);
  const innerSize = size - strokeWidth * 2;

  // We split the ring into two halves. Right half always shows;
  // left half shows only when progress > 50%.
  const rightRotation = -180 + Math.min(clampedPercent * 2, 1) * 180;
  const leftPercent = Math.max(clampedPercent - 0.5, 0) * 2;
  const leftRotation = -180 + leftPercent * 180;

  const remaining = Math.max(goal - value, 0);
  const percentLabel = Math.round(clampedPercent * 100);

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Track (background ring) */}
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.primaryDim,
          },
        ]}
      />

      {/* Right half progress */}
      <View
        style={[
          styles.halfContainer,
          { width: size / 2, height: size, right: 0, overflow: 'hidden' },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: colors.primary,
              transform: [{ rotate: `${rightRotation}deg` }],
              left: -size / 2,
            },
          ]}
        />
      </View>

      {/* Left half progress (visible when > 50%) */}
      <View
        style={[
          styles.halfContainer,
          { width: size / 2, height: size, left: 0, overflow: 'hidden' },
        ]}
      >
        <View
          style={[
            styles.halfCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: clampedPercent >= 0.5 ? colors.primary : 'transparent',
              transform: [{ rotate: `${leftRotation}deg` }],
              left: 0,
            },
          ]}
        />
      </View>

      {/* Inner content */}
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            top: strokeWidth,
            left: strokeWidth,
          },
        ]}
      >
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
  track: {
    position: 'absolute',
  },
  halfContainer: {
    position: 'absolute',
    top: 0,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  inner: {
    position: 'absolute',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...typography.displayLarge,
    color: colors.primary,
    lineHeight: 36,
  },
  labelText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  remainingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
  },
  percentBadge: {
    marginTop: 8,
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  percentText: {
    ...typography.labelSmall,
    color: colors.primary,
  },
});
