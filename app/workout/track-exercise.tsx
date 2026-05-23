import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TabView, type Route } from 'react-native-tab-view';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import {
  getOrCreateTodayWorkoutLog,
  logExerciseSet,
  getTodayLoggedSetsForExercise,
  getUserPreference,
  updateExerciseSet,
  deleteExerciseSet,
} from '@/src/db/queries';
import { DEV_USER_ID, ExerciseSet } from '@/src/types';

// ─── Sub-Tab Custom Tab Bar ──────────────────────────────────────────────────

type TabBarProps = {
  routes: Route[];
  index: number;
  onTabPress: (i: number) => void;
};

function WorkoutSubTabBar({ routes, index, onTabPress }: TabBarProps) {
  return (
    <View style={styles.tabBar}>
      {routes.map((route, i) => {
        const isActive = i === index;
        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onTabPress(i)}
          >
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {route.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Tab A: TRACK page ────────────────────────────────────────────────────────

type TrackTabProps = {
  exerciseId: string;
  exerciseName: string;
  initialEditSetId?: string;
};

function TrackTab({ exerciseId, exerciseName, initialEditSetId }: TrackTabProps) {
  const db = useSQLiteContext();

  // Unit preferences state
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  // Input states (both parsed numbers and raw string text states)
  const [weight, setWeight] = useState(60.0);
  const [weightInput, setWeightInput] = useState('60.0');

  const [reps, setReps] = useState(9);
  const [repsInput, setRepsInput] = useState('9');

  const [isSaving, setIsSaving] = useState(false);
  const [loggedSets, setLoggedSets] = useState<ExerciseSet[]>([]);

  // Editing set state
  const [editingSet, setEditingSet] = useState<ExerciseSet | null>(null);

  // Fetch unit preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const activeUnit = await getUserPreference(db, 'workout_unit');
      if (activeUnit === 'metric' || activeUnit === 'imperial') {
        setUnit(activeUnit);
      }
    } catch (e) {
      console.error("Failed to load unit preference:", e);
    }
  }, [db]);

  // Fetch logged sets for today
  const fetchLoggedSets = useCallback(async () => {
    try {
      const data = await getTodayLoggedSetsForExercise(db, DEV_USER_ID, exerciseId);
      setLoggedSets(data);
    } catch (e) {
      console.error('Failed to fetch logged sets:', e);
    }
  }, [db, exerciseId]);

  // Load preferences and then logged sets
  useEffect(() => {
    fetchPreferences().then(() => {
      fetchLoggedSets();
    });
  }, [db, fetchPreferences, fetchLoggedSets]);

  // Set default initial weight based on the active unit
  useEffect(() => {
    getUserPreference(db, 'workout_unit').then((activeUnit) => {
      if (activeUnit === 'imperial') {
        setWeight(135.0);
        setWeightInput('135.0');
      } else {
        setWeight(60.0);
        setWeightInput('60.0');
      }
    });
  }, [db]);

  // Deep Link: select the set if initialEditSetId matches when loggedSets are fetched
  useEffect(() => {
    if (initialEditSetId && loggedSets.length > 0) {
      const match = loggedSets.find(s => s.id === initialEditSetId);
      if (match) {
        startEditing(match);
      }
    }
  }, [initialEditSetId, loggedSets]);

  // Switch inputs to edit mode
  const startEditing = (set: ExerciseSet) => {
    setEditingSet(set);
    // Convert DB weight (stored in kg) to active displayed unit
    const displayedWeight = unit === 'imperial' ? parseFloat((set.weight * 2.20462).toFixed(1)) : set.weight;
    setWeight(displayedWeight);
    setWeightInput(displayedWeight.toFixed(1));
    setReps(set.reps);
    setRepsInput(set.reps.toString());
  };

  // Exit edit mode and reset to unit default values
  const cancelEditing = () => {
    setEditingSet(null);
    const defaultWeight = unit === 'imperial' ? 135.0 : 60.0;
    const defaultReps = 9;
    setWeight(defaultWeight);
    setWeightInput(defaultWeight.toFixed(1));
    setReps(defaultReps);
    setRepsInput(defaultReps.toString());
  };

  // Handle completed set row click (toggle edit mode)
  const handleSetRowPress = (set: ExerciseSet) => {
    if (editingSet && editingSet.id === set.id) {
      cancelEditing();
    } else {
      startEditing(set);
    }
  };

  // Steppers (Updates both the parsed number state and direct input string text)
  const adjustWeight = (amount: number) => {
    setWeight((prev) => {
      const next = Math.max(0, parseFloat((prev + amount).toFixed(1)));
      setWeightInput(next.toFixed(1));
      return next;
    });
  };

  const adjustReps = (amount: number) => {
    setReps((prev) => {
      const next = Math.max(0, prev + amount);
      setRepsInput(next.toString());
      return next;
    });
  };

  // Direct keyboard changes
  const handleWeightInputChange = (text: string) => {
    setWeightInput(text);
    const val = parseFloat(text);
    if (!isNaN(val) && val >= 0) {
      setWeight(val);
    } else {
      setWeight(0);
    }
  };

  const handleRepsInputChange = (text: string) => {
    setRepsInput(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 0) {
      setReps(val);
    } else {
      setReps(0);
    }
  };

  // Save new set
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const workoutLog = await getOrCreateTodayWorkoutLog(db, DEV_USER_ID);
      // Convert weight back to kg if Imperial
      const weightInKg = unit === 'imperial' ? parseFloat((weight / 2.20462).toFixed(2)) : weight;
      await logExerciseSet(db, workoutLog.id, exerciseId, weightInKg, reps);

      // Re-fetch completed sets to update the UI list instantly
      await fetchLoggedSets();
    } catch (e) {
      console.error('Failed to log set:', e);
      Alert.alert('Error', 'Failed to log set. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setWeight(0);
    setWeightInput('0.0');
    setReps(0);
    setRepsInput('0');
  };

  // Update existing set
  const handleUpdate = async () => {
    if (!editingSet) return;
    setIsSaving(true);
    try {
      // Convert weight back to kg if Imperial
      const weightInKg = unit === 'imperial' ? parseFloat((weight / 2.20462).toFixed(2)) : weight;
      await updateExerciseSet(db, editingSet.id, weightInKg, reps);

      cancelEditing();
      await fetchLoggedSets();
    } catch (e) {
      console.error('Failed to update set:', e);
      Alert.alert('Error', 'Failed to update set.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete set
  const handleDelete = async () => {
    if (!editingSet) return;
    setIsSaving(true);
    try {
      await deleteExerciseSet(db, editingSet.id);
      cancelEditing();
      await fetchLoggedSets();
    } catch (e) {
      console.error('Failed to delete set:', e);
      Alert.alert('Error', 'Failed to delete set.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate if weight/reps entries have changed during edit mode
  const hasChanges = useMemo(() => {
    if (!editingSet) return false;
    const originalWeightInActiveUnit = unit === 'imperial' ? parseFloat((editingSet.weight * 2.20462).toFixed(1)) : editingSet.weight;
    return weight !== originalWeightInActiveUnit || reps !== editingSet.reps;
  }, [editingSet, weight, reps, unit]);

  // Display conversions for lists below
  const displayWeight = (kg: number) => {
    if (unit === 'imperial') {
      return parseFloat((kg * 2.20462).toFixed(1));
    }
    return kg;
  };

  const unitLabel = unit === 'imperial' ? 'lbs' : 'kg';

  return (
    <ScrollView
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Weight stepper */}
      <View style={styles.stepperContainer}>
        <Text style={styles.stepperLabel}>WEIGHT ({unitLabel})</Text>
        <View style={styles.dividerLine} />
        <View style={styles.stepperRow}>
          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.8 }]}
            onPress={() => adjustWeight(-5)}
          >
            <Ionicons name="remove" size={24} color={colors.text} />
          </Pressable>

          <TextInput
            style={styles.stepperInput}
            value={weightInput}
            onChangeText={handleWeightInputChange}
            keyboardType="decimal-pad"
            selectTextOnFocus
            textAlign="center"
          />

          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.8 }]}
            onPress={() => adjustWeight(5)}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Reps stepper */}
      <View style={styles.stepperContainer}>
        <Text style={styles.stepperLabel}>REPS</Text>
        <View style={styles.dividerLine} />
        <View style={styles.stepperRow}>
          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.8 }]}
            onPress={() => adjustReps(-1)}
          >
            <Ionicons name="remove" size={24} color={colors.text} />
          </Pressable>

          <TextInput
            style={styles.stepperInput}
            value={repsInput}
            onChangeText={handleRepsInputChange}
            keyboardType="number-pad"
            selectTextOnFocus
            textAlign="center"
          />

          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.8 }]}
            onPress={() => adjustReps(1)}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Dynamic Action Buttons Swapper */}
      {editingSet ? (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn, // Teal color
              (!hasChanges || isSaving) && styles.saveBtnDisabled,
              hasChanges && !isSaving && pressed && { opacity: 0.85 },
            ]}
            onPress={handleUpdate}
            disabled={!hasChanges || isSaving}
          >
            <Text style={styles.saveBtnText}>UPDATE</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn, // Crimson/Dark Slate style
              pressed && { opacity: 0.85 },
              isSaving && { opacity: 0.6 },
            ]}
            onPress={handleDelete}
            disabled={isSaving}
          >
            <Text style={styles.deleteBtnText}>DELETE</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.85 },
              isSaving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>SAVE</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.85 }]}
            onPress={handleClear}
          >
            <Text style={styles.clearBtnText}>CLEAR</Text>
          </Pressable>
        </View>
      )}

      {/* Completed Sets List matching screenshot */}
      {loggedSets.length > 0 && (
        <View style={styles.loggedSetsContainer}>
          {loggedSets.map((set, idx) => {
            const isSetSelected = editingSet && editingSet.id === set.id;
            return (
              <Pressable
                key={set.id}
                style={({ pressed }) => [
                  styles.loggedSetRow,
                  isSetSelected && styles.loggedSetRowSelected,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleSetRowPress(set)}
              >
                <View style={styles.loggedSetLeft}>
                  <Ionicons
                    name={isSetSelected ? "create-outline" : "chatbox-ellipses-outline"}
                    size={18}
                    color={isSetSelected ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.loggedSetNumber, isSetSelected && { color: colors.primary }]}>
                    Set {idx + 1} {isSetSelected && "(Editing)"}
                  </Text>
                </View>
                <View style={styles.loggedSetRight}>
                  <Text style={[styles.loggedSetWeight, isSetSelected && { color: colors.primary }]}>
                    {displayWeight(set.weight).toFixed(1)}{' '}
                    <Text style={styles.loggedSetUnit}>{unitLabel}</Text>
                  </Text>
                  <Text style={[styles.loggedSetReps, isSetSelected && { color: colors.primary }]}>
                    {set.reps}{' '}
                    <Text style={styles.loggedSetUnit}>reps</Text>
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Tab B: HISTORY placeholder ───────────────────────────────────────────────

function HistoryPlaceholder() {
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="time-outline" size={44} color={colors.textMuted} />
      <Text style={styles.placeholderTitle}>History Coming Soon</Text>
      <Text style={styles.placeholderSubtitle}>
        View your past workouts and performance logs for this exercise.
      </Text>
    </View>
  );
}

// ─── Tab C: GRAPH placeholder ─────────────────────────────────────────────────

function GraphPlaceholder() {
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="trending-up-outline" size={44} color={colors.textMuted} />
      <Text style={styles.placeholderTitle}>Graphs Coming Soon</Text>
      <Text style={styles.placeholderSubtitle}>
        Visualise your progression and estimated 1-Rep Max trends over time.
      </Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ROUTES: Route[] = [
  { key: 'track', title: 'TRACK' },
  { key: 'history', title: 'HISTORY' },
  { key: 'graph', title: 'GRAPH' },
];

export default function TrackExerciseScreen() {
  const router = useRouter();
  const layout = useWindowDimensions();
  const params = useLocalSearchParams<{ exerciseId: string; exerciseName: string; editSetId?: string }>();

  const exerciseId = params.exerciseId ?? '';
  const exerciseName = params.exerciseName ?? 'Exercise';
  const editSetId = params.editSetId;

  const [index, setIndex] = useState(0);

  const renderScene = useCallback(
    ({ route }: { route: Route }) => {
      switch (route.key) {
        case 'track':
          return (
            <TrackTab
              exerciseId={exerciseId}
              exerciseName={exerciseName}
              initialEditSetId={editSetId}
            />
          );
        case 'history':
          return <HistoryPlaceholder />;
        case 'graph':
          return <GraphPlaceholder />;
        default:
          return null;
      }
    },
    [exerciseId, exerciseName, editSetId]
  );

  const handleAction = (msg: string) => {
    Alert.alert('Exercise Info', `${msg} feature coming soon!`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* High Fidelity Premium Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [styles.plusButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/workout/select-muscle')}
          >
            <Ionicons name="add" size={28} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {exerciseName}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => handleAction('Rest Timer')}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="time-sharp" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => handleAction('PR Records')}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="trophy-sharp" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => handleAction('Exercise Guide')}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="information-circle-sharp" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/workouts')}
            style={({ pressed }) => [styles.headerActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="checkmark-sharp" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Subpage custom Tab Bar */}
      <WorkoutSubTabBar
        routes={ROUTES}
        index={index}
        onTabPress={setIndex}
      />

      {/* Swipeable Tabs */}
      <TabView
        navigationState={{ index, routes: ROUTES }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
        lazy
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  plusButton: {
    padding: 2,
    marginRight: spacing.xs,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerActionBtn: {
    padding: 4,
  },

  // Sub Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#26C6DA', // cyan active line matching image
  },
  tabLabel: {
    ...typography.labelLarge,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  tabLabelActive: {
    color: '#26C6DA', // cyan color matching image
  },

  // Steppers Tab Content
  tabScroll: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  stepperContainer: {
    gap: spacing.sm,
  },
  stepperLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: 2,
  },
  dividerLine: {
    height: 2,
    backgroundColor: '#26C6DA', // cyan horizontal bar matching weight/reps line
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  stepBtn: {
    backgroundColor: '#1E293B', // dark slate background
    borderWidth: 1,
    borderColor: '#334155',
    width: 60,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    fontFamily: 'Jura-Bold',
    color: colors.text,
    fontSize: 38,
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
    margin: 0,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#0D9488', // premium teal green matching image
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.6,
  },
  saveBtnText: {
    fontFamily: 'Jura-Bold',
    fontSize: 15,
    color: colors.text,
    letterSpacing: 0.8,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#2563EB', // blue matching image
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontFamily: 'Jura-Bold',
    fontSize: 15,
    color: colors.text,
    letterSpacing: 0.8,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#DC2626', // crimson red for deletion
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontFamily: 'Jura-Bold',
    fontSize: 15,
    color: colors.text,
    letterSpacing: 0.8,
  },

  // Logged Sets Container under steppers
  loggedSetsContainer: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  loggedSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  loggedSetRowSelected: {
    backgroundColor: 'rgba(38, 198, 218, 0.1)',
    borderColor: '#26C6DA',
    borderWidth: 1,
  },
  loggedSetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loggedSetNumber: {
    fontFamily: 'Jura-Bold',
    fontSize: 14,
    color: colors.text,
  },
  loggedSetRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  loggedSetWeight: {
    fontFamily: 'Jura-Bold',
    fontSize: 14,
    color: colors.text,
    width: 80,
    textAlign: 'right',
  },
  loggedSetReps: {
    fontFamily: 'Jura-Bold',
    fontSize: 14,
    color: colors.text,
    width: 80,
    textAlign: 'right',
  },
  loggedSetUnit: {
    fontFamily: 'Jura-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },

  // Placeholders
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  placeholderTitle: {
    ...typography.titleMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  placeholderSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
