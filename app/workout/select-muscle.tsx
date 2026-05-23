import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { MuscleGroup } from '@/src/types';

interface MuscleItem {
  key: MuscleGroup;
  label: string;
}

const MUSCLE_GROUPS: MuscleItem[] = [
  { key: 'abs', label: 'Abs' },
  { key: 'back', label: 'Back' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'chest', label: 'Chest' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'legs', label: 'Legs' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'triceps', label: 'Triceps' },
];

export default function SelectMuscleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [search, setSearch] = useState('');

  const filteredMuscles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MUSCLE_GROUPS;
    return MUSCLE_GROUPS.filter((m) => m.label.toLowerCase().includes(q));
  }, [search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>All Exercises</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search muscle group..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Muscle List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredMuscles.map((muscle) => (
          <Pressable
            key={muscle.key}
            style={({ pressed }) => [
              styles.muscleItem,
              pressed && styles.muscleItemPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/workout/select-exercise',
                params: { muscle: muscle.key, label: muscle.label, date: params.date },
              })
            }
          >
            <Text style={styles.muscleLabel}>{muscle.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}

        {filteredMuscles.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No muscle groups match your search</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: colors.text,
  },
  headerPlaceholder: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 46,
    gap: spacing.xs,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text,
    height: '100%',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  muscleItemPressed: {
    backgroundColor: colors.backgroundElevated,
    opacity: 0.9,
  },
  muscleLabel: {
    ...typography.titleSmall,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
});
