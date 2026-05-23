import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/src/styles/globals';

export default function MealsGraphPage() {
  return (
    <View style={styles.container}>
      <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
      <Text style={styles.title}>Graphs Coming Soon</Text>
      <Text style={styles.subtitle}>
        Visualise your nutrition trends over time
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textSecondary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
