import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { getTodayLoggedSets, LoggedSetDetail, getUserPreference, setUserPreference } from '@/src/db/queries';
import { DEV_USER_ID } from '@/src/types';

// Grouping structure for displaying today's logged sets
interface GroupedSets {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: { id: string; weight: number; reps: number }[];
}

export default function WorkoutsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [todaySets, setTodaySets] = useState<LoggedSetDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings states
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Fetch unit preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const activeUnit = await getUserPreference(db, 'workout_unit');
      if (activeUnit === 'metric' || activeUnit === 'imperial') {
        setUnit(activeUnit);
      }
    } catch (e) {
      console.error("Failed to load user preferences:", e);
    }
  }, [db]);

  // Fetch today's sets
  const fetchTodaySets = useCallback(async () => {
    setIsLoading(true);
    try {
      const sets = await getTodayLoggedSets(db, DEV_USER_ID);
      setTodaySets(sets);
    } catch (e) {
      console.error("Failed to load today's sets:", e);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Re-fetch whenever the screen becomes active
  useFocusEffect(
    useCallback(() => {
      fetchPreferences();
      fetchTodaySets();
    }, [fetchPreferences, fetchTodaySets])
  );

  // Unit settings toggling handler
  const handleToggleUnit = async (newUnit: 'metric' | 'imperial') => {
    try {
      await setUserPreference(db, 'workout_unit', newUnit);
      setUnit(newUnit);
    } catch (e) {
      console.error("Failed to save unit setting:", e);
    }
  };

  // Convert displayed weight based on current preference (metric/imperial)
  const displayWeight = (kg: number) => {
    if (unit === 'imperial') {
      return parseFloat((kg * 2.20462).toFixed(1));
    }
    return kg;
  };

  const unitLabel = unit === 'imperial' ? 'lbs' : 'kg';

  // Group logged sets by exercise
  const groupedWorkouts = useMemo(() => {
    const map = new Map<string, GroupedSets>();
    for (const s of todaySets) {
      if (!map.has(s.exerciseId)) {
        map.set(s.exerciseId, {
          exerciseId: s.exerciseId,
          exerciseName: s.exerciseName,
          muscleGroup: s.muscleGroup,
          sets: [],
        });
      }
      map.get(s.exerciseId)!.sets.push({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
      });
    }
    return Array.from(map.values());
  }, [todaySets]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Visual Navigation Top Bar — Consistent with Meals */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Workouts</Text>
        <Pressable
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.6 }]}
          onPress={() => setSettingsVisible(true)}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Date Subheader */}
      <View style={styles.subHeader}>
        <Pressable style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back-sharp" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.dateTitle}>TODAY</Text>
        <Pressable style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-forward-sharp" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Scrollable Workouts List or Empty State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {groupedWorkouts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Workout Log Empty</Text>
              <Text style={styles.emptySubtext}>Start a new workout to log your exercises</Text>
            </View>
          ) : (
            groupedWorkouts.map((workout) => (
              <View key={workout.exerciseId} style={styles.workoutCard}>
                {/* Clicking on the header cards lets them track new sets of this exercise */}
                <Pressable
                  style={styles.cardHeader}
                  onPress={() =>
                    router.push({
                      pathname: '/workout/track-exercise',
                      params: { exerciseId: workout.exerciseId, exerciseName: workout.exerciseName },
                    })
                  }
                >
                  <Text style={styles.exerciseTitle}>{workout.exerciseName}</Text>
                  <View style={styles.muscleBadge}>
                    <Text style={styles.muscleBadgeText}>
                      {workout.muscleGroup.toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.setsList}>
                  {workout.sets.map((set, i) => (
                    <Pressable
                      key={set.id}
                      style={({ pressed }) => [
                        styles.setRow,
                        pressed && styles.setRowPressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: '/workout/track-exercise',
                          params: {
                            exerciseId: workout.exerciseId,
                            exerciseName: workout.exerciseName,
                            editSetId: set.id,
                          },
                        })
                      }
                    >
                      <Text style={styles.setLabel}>Set {i + 1}</Text>
                      <Text style={styles.setValue}>
                        {displayWeight(set.weight)} {unitLabel} × {set.reps} reps
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Bottom Action Controls */}
      <View style={styles.bottomActions}>
        <Pressable
          style={({ pressed }) => [styles.actionBlock, pressed && { opacity: 0.75 }]}
          onPress={() => router.push('/workout/select-muscle')}
        >
          <Ionicons name="add" size={32} color={colors.primary} />
          <Text style={styles.actionText}>Start New Workout</Text>
        </Pressable>
      </View>

      {/* Settings Modal Sheet */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSettingsVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workout Settings</Text>
              <Pressable onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Unit of Measurement</Text>
            <View style={styles.settingsRow}>
              <Pressable
                style={[
                  styles.settingsOption,
                  unit === 'metric' && styles.settingsOptionActive,
                ]}
                onPress={() => handleToggleUnit('metric')}
              >
                <Text
                  style={[
                    styles.settingsOptionText,
                    unit === 'metric' && styles.settingsOptionTextActive,
                  ]}
                >
                  Metric (kg)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.settingsOption,
                  unit === 'imperial' && styles.settingsOptionActive,
                ]}
                onPress={() => handleToggleUnit('imperial')}
              >
                <Text
                  style={[
                    styles.settingsOptionText,
                    unit === 'imperial' && styles.settingsOptionTextActive,
                  ]}
                >
                  Imperial (lbs)
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  settingsBtn: {
    padding: 6,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.text,
    fontSize: 26,
    letterSpacing: 0.5,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  arrowBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dateTitle: {
    ...typography.titleMedium,
    color: colors.text,
    letterSpacing: 1.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.titleMedium,
    color: colors.textSecondary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bottomActions: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  actionBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionText: {
    ...typography.titleSmall,
    color: colors.text,
    marginTop: 2,
  },

  // Workout Cards
  workoutCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  exerciseTitle: {
    ...typography.titleMedium,
    color: colors.text,
    flex: 1,
  },
  muscleBadge: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  muscleBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 9,
  },
  setsList: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  setRowPressed: {
    backgroundColor: colors.backgroundElevated,
  },
  setLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  setValue: {
    ...typography.titleSmall,
    color: colors.textSecondary,
  },

  // Modal Settings
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.titleLarge,
    color: colors.text,
  },
  modalLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  settingsOption: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  settingsOptionText: {
    ...typography.titleSmall,
    color: colors.textSecondary,
  },
  settingsOptionTextActive: {
    color: colors.primary,
  },
});
