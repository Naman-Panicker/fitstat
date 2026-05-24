import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Modal, Animated, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { getLoggedSetsForDate, LoggedSetDetail, getUserPreference, setUserPreference, getOrCreateWorkoutLogForDate } from '@/src/db/queries';
import { useAuth } from '@/src/context/AuthContext';

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
  const { userId } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [todaySets, setTodaySets] = useState<LoggedSetDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings states
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Touch gesture state
  const touchStartX = React.useRef(0);

  // Animated FAB state & variables
  const animValue = React.useRef(new Animated.Value(0)).current;
  const [isScrolled, setIsScrolled] = useState(false);

  const animatedLeft = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, screenWidth - 24 - 56],
  });

  const animatedRight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 24],
  });

  const animatedBottom = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 24],
  });

  const animatedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 56],
  });

  const animatedRadius = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 28],
  });

  const animatedBg = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primary],
  });

  const textOpacity = animValue.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0, 0],
  });

  const textWidth = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [140, 0],
  });

  const animatedPaddingLeft = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const animatedPaddingRight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  const textMarginLeft = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  // Helper: Format Date to YYYY-MM-DD
  const dateToSqlStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Format Date Title
  const formatDateTitle = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const dStr = dateToSqlStr(date);
    const todayStrVal = dateToSqlStr(today);
    const yesterdayStrVal = dateToSqlStr(yesterday);
    
    if (dStr === todayStrVal) {
      return 'TODAY';
    }
    if (dStr === yesterdayStrVal) {
      return 'YESTERDAY';
    }
    
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options).toUpperCase();
  };

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

  // Fetch sets for selected date
  const fetchSets = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateStr = dateToSqlStr(selectedDate);
      const sets = await getLoggedSetsForDate(db, userId, dateStr);
      setTodaySets(sets);
    } catch (e) {
      console.error("Failed to load sets for date:", e);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedDate, userId]);


  // Re-fetch whenever screen active or date changes
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadData() {
        try {
          await fetchPreferences();
          if (isMounted) {
            await fetchSets();
          }
        } catch (e) {
          console.error("Failed to load workouts data sequentially:", e);
        }
      }
      loadData();
      return () => {
        isMounted = false;
      };
    }, [fetchPreferences, fetchSets])
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

  // Day togglers
  const handlePreviousDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    const todayStrVal = dateToSqlStr(new Date());
    const selectedStrVal = dateToSqlStr(selectedDate);
    if (selectedStrVal === todayStrVal) {
      // Block future dates
      return;
    }
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 1);
      return next;
    });
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const dx = touchEndX - touchStartX.current;
    const swipeThreshold = 60; // minimum swipe displacement

    if (dx > swipeThreshold) {
      // Swiped right -> go to PREVIOUS day
      handlePreviousDay();
    } else if (dx < -swipeThreshold) {
      // Swiped left -> go to NEXT day
      handleNextDay();
    }
  };

  const isToday = dateToSqlStr(selectedDate) === dateToSqlStr(new Date());

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

  const dateStrParam = dateToSqlStr(selectedDate);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Visual Navigation Gesture Area wrapper */}
      <View
        style={{ flex: 1 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
          <Pressable
            style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}
            onPress={handlePreviousDay}
          >
            <Ionicons name="chevron-back-sharp" size={20} color={colors.primary} />
          </Pressable>
          <Text style={styles.dateTitle}>{formatDateTitle(selectedDate)}</Text>
          <Pressable
            style={({ pressed }) => [styles.arrowBtn, (pressed && !isToday) && { opacity: 0.6 }]}
            onPress={handleNextDay}
            disabled={isToday}
          >
            <Ionicons
              name="chevron-forward-sharp"
              size={20}
              color={isToday ? colors.textMuted : colors.primary}
            />
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
            contentContainerStyle={[styles.bodyContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const offsetY = e.nativeEvent.contentOffset.y;
              if (offsetY > 40) {
                if (!isScrolled) {
                  setIsScrolled(true);
                  Animated.timing(animValue, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: false,
                  }).start();
                }
              } else {
                if (isScrolled) {
                  setIsScrolled(false);
                  Animated.timing(animValue, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                  }).start();
                }
              }
            }}
            scrollEventThrottle={16}
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
                        params: {
                          exerciseId: workout.exerciseId,
                          exerciseName: workout.exerciseName,
                          date: dateStrParam,
                        },
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
                              date: dateStrParam,
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

        {/* Collapsing Animated Floating Action Button */}
        <Animated.View
          style={[
            styles.animatedButtonContainer,
            {
              left: animatedLeft,
              right: animatedRight,
              bottom: animatedBottom,
              height: animatedHeight,
              borderRadius: animatedRadius,
              backgroundColor: animatedBg,
            },
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() =>
              router.push({
                pathname: '/workout/select-muscle',
                params: { date: dateStrParam },
              })
            }
          >
            <Animated.View
              style={[
                styles.animatedButtonPressable,
                {
                  paddingLeft: animatedPaddingLeft,
                  paddingRight: animatedPaddingRight,
                },
              ]}
            >
              <View style={styles.iconStack}>
                <Animated.View style={{ opacity: animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: animValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="add" size={24} color={colors.background} />
                </Animated.View>
              </View>

              <Animated.Text
                style={[
                  styles.actionText,
                  {
                    opacity: textOpacity,
                    width: textWidth,
                    marginLeft: textMarginLeft,
                  },
                ]}
                numberOfLines={1}
              >
                Start New Workout
              </Animated.Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
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
  animatedButtonContainer: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  animatedButtonPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStack: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...typography.titleSmall,
    color: colors.text,
    textAlign: 'center',
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
