import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import {
  fetchWeightLogs,
  logWeightForDate,
  deleteWeightLog,
  WeightLog,
  saveNotificationPreference,
} from '@/src/db/queries';
import { LineChart } from 'react-native-gifted-charts';
import { useIsFocused } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;
type TabSegment = 'LOG' | 'HISTORY' | 'TRENDS';

export default function WeightScreen() {
  const db = useSQLiteContext();
  const { userId } = useAuth();
  const isFocused = useIsFocused();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabSegment>('LOG');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<WeightLog[]>([]);

  // Form states
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('75.0');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [calorieGoal, setCalorieGoal] = useState('2000');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // Fetch weight history and targets
  const loadWeightData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const history = await fetchWeightLogs(db, userId);
      setLogs(history);

      // Load goals & preferences from SQLite
      const prefRows = await db.getAllAsync<{ key: string; value: string }>(
        "SELECT key, value FROM user_preferences WHERE user_id = ? AND key IN ('weight_target', 'weight_unit', 'calorie_goal')",
        userId
      );

      prefRows.forEach((row) => {
        if (row.key === 'weight_target') setTargetWeight(row.value);
        if (row.key === 'weight_unit') setWeightUnit(row.value);
        if (row.key === 'calorie_goal') setCalorieGoal(row.value);
      });

      // Check if today has already been logged
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayLog = history.find((l) => l.loggedAt === todayStr);
      if (todayLog) {
        setCurrentWeight(todayLog.weight.toString());
      } else {
        setCurrentWeight('');
      }
    } catch {
      console.error('Failed to load weight metrics');
    } finally {
      setLoading(false);
    }
  }, [db, userId]);

  useEffect(() => {
    if (isFocused) {
      loadWeightData();
    }
  }, [isFocused, loadWeightData]);

  // Handle logging current weight
  const handleSaveWeight = async () => {
    const parsedWeight = parseFloat(currentWeight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid weight value.');
      return;
    }

    setIsSaving(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      await logWeightForDate(db, userId, parsedWeight, todayStr);
      Keyboard.dismiss();
      Alert.alert('Success', 'Today\'s weight logged successfully!');
      await loadWeightData();
    } catch {
      Alert.alert('Error', 'Failed to save weight entry.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle updating goal targets
  const handleSaveGoals = async () => {
    const parsedTarget = parseFloat(targetWeight);
    const parsedCal = parseInt(calorieGoal);

    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid target weight.');
      return;
    }
    if (isNaN(parsedCal) || parsedCal <= 500) {
      Alert.alert('Validation Error', 'Please enter a realistic calorie goal (above 500 kcal).');
      return;
    }

    setIsSavingGoals(true);
    try {
      await saveNotificationPreference(db, userId, 'weight_target', parsedTarget.toFixed(1));
      await saveNotificationPreference(db, userId, 'calorie_goal', parsedCal.toString());
      Keyboard.dismiss();
      Alert.alert('Goals Synced', 'Your targets and calorie limits have been updated!');
      await loadWeightData();
    } catch {
      Alert.alert('Error', 'Failed to save preference goals.');
    } finally {
      setIsSavingGoals(false);
    }
  };

  // Handle deleting a log entry
  const handleDeleteLog = (logId: string, dateLabel: string) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete your weight log for ${dateLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWeightLog(db, logId);
              await loadWeightData();
            } catch {
              Alert.alert('Error', 'Failed to delete entry.');
            }
          },
        },
      ]
    );
  };

  // Process history list to calculate relative changes (+/- weight compared to previous record)
  const historyList = useMemo(() => {
    const sortedChronological = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    const changesMap = new Map<string, number | null>();

    sortedChronological.forEach((log, index) => {
      if (index === 0) {
        changesMap.set(log.id, null); // Oldest log has no previous baseline
      } else {
        const prev = sortedChronological[index - 1];
        changesMap.set(log.id, log.weight - prev.weight);
      }
    });

    return logs.map((log) => {
      const diff = changesMap.get(log.id) ?? null;
      const d = new Date(log.loggedAt + 'T00:00:00');
      const formattedDate = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      return {
        ...log,
        formattedDate,
        diff,
      };
    });
  }, [logs]);

  // Process chart data for Gifted LineChart
  const lineChartData = useMemo(() => {
    if (logs.length === 0) return [];

    // Chronological order for line chart
    const chronological = [...logs].reverse();
    
    // We cap the line graph displaying at most the latest 10 logs to keep it readable
    const subset = chronological.slice(-10);

    return subset.map((log) => {
      const d = new Date(log.loggedAt + 'T00:00:00');
      const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        value: log.weight,
        label: shortLabel,
        dateLabel: log.loggedAt,
      };
    });
  }, [logs]);

  // Calculate dynamic axis and spacing bounds
  const spacingVal = useMemo(() => {
    if (lineChartData.length <= 1) return 180;
    return Math.max(30, Math.min(80, (screenWidth - 72) / (lineChartData.length - 1 || 1)));
  }, [lineChartData]);

  const { yAxisMax, yAxisMin } = useMemo(() => {
    if (lineChartData.length === 0) return { yAxisMax: 100, yAxisMin: 50 };
    const values = lineChartData.map((d) => d.value);
    const targetVal = parseFloat(targetWeight) || 75;
    const maxVal = Math.max(...values, targetVal);
    const minVal = Math.min(...values, targetVal);

    return {
      yAxisMax: Math.ceil(maxVal + 5),
      yAxisMin: Math.floor(minVal - 5),
    };
  }, [lineChartData, targetWeight]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Body Weight</Text>
        {logs.length > 0 && (
          <View style={styles.subtitleRow}>
            <Text style={styles.headerSubtitle}>LATEST: {logs[0].weight} {weightUnit}</Text>
            <Text style={styles.targetDot}>•</Text>
            <Text style={styles.headerSubtitle}>GOAL: {targetWeight} {weightUnit}</Text>
          </View>
        )}
      </View>

      {/* Sub-tab bar */}
      <View style={styles.tabBar}>
        {(['LOG', 'HISTORY', 'TRENDS'] as TabSegment[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setActiveTab(tab);
              }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. LOG VIEW */}
          {activeTab === 'LOG' && (
            <View style={styles.tabContent}>
              {/* Daily Weight Logger */}
              <Text style={styles.sectionLabel}>DAILY LOG</Text>
              <View style={styles.card}>
                <Text style={styles.inputTitle}>{"Today's Weight"} ({weightUnit})</Text>
                <TextInput
                  style={styles.numericInput}
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  placeholder="e.g. 74.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  autoCorrect={false}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && { opacity: 0.8 },
                    isSaving && { opacity: 0.6 },
                  ]}
                  onPress={handleSaveWeight}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <>
                      <Ionicons name="scale-outline" size={18} color={colors.background} />
                      <Text style={styles.btnPrimaryText}>Record Weight</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Goal Targets Config */}
              <Text style={styles.sectionLabel}>TARGETS & LIMITS</Text>
              <View style={styles.card}>
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputTitle}>Target Weight ({weightUnit})</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={targetWeight}
                      onChangeText={setTargetWeight}
                      keyboardType="decimal-pad"
                      autoCorrect={false}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.inputTitle}>Calorie Goal (kcal)</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={calorieGoal}
                      onChangeText={setCalorieGoal}
                      keyboardType="number-pad"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.btnSecondary,
                    pressed && { opacity: 0.8 },
                    isSavingGoals && { opacity: 0.6 },
                  ]}
                  onPress={handleSaveGoals}
                  disabled={isSavingGoals}
                >
                  {isSavingGoals ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <>
                      <Ionicons name="sync-outline" size={18} color={colors.text} />
                      <Text style={styles.btnSecondaryText}>Update Targets</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* 2. HISTORY VIEW */}
          {activeTab === 'HISTORY' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionLabel}>MEASUREMENT HISTORY</Text>
              {historyList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyText}>No weight measurements recorded yet.</Text>
                </View>
              ) : (
                historyList.map((item) => {
                  let diffLabel = '';
                  let diffColor = colors.textSecondary;

                  if (item.diff !== null) {
                    const absVal = Math.abs(item.diff).toFixed(1);
                    if (item.diff < 0) {
                      diffLabel = `-${absVal} ${weightUnit}`;
                      diffColor = colors.success; // Weight loss is green/positive progress!
                    } else if (item.diff > 0) {
                      diffLabel = `+${absVal} ${weightUnit}`;
                      diffColor = colors.alert; // Weight gain is red!
                    } else {
                      diffLabel = `0.0 ${weightUnit}`;
                      diffColor = colors.textMuted;
                    }
                  }

                  return (
                    <View key={item.id} style={styles.historyRow}>
                      <View style={styles.historyLeft}>
                        <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.historyDate}>{item.formattedDate}</Text>
                      </View>

                      <View style={styles.historyRight}>
                        <Text style={styles.historyWeight}>
                          {item.weight} {weightUnit}
                        </Text>
                        {diffLabel !== '' && (
                          <Text style={[styles.historyDiff, { color: diffColor }]}>
                            ({diffLabel})
                          </Text>
                        )}
                        <Pressable
                          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                          onPress={() => handleDeleteLog(item.id, item.formattedDate)}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.alert} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* 3. TRENDS VIEW */}
          {activeTab === 'TRENDS' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionLabel}>PROGRESS ANALYSIS</Text>
              {lineChartData.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="trending-up-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Record your weight over multiple days to construct charts!</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.chartTitle}>Weight Curve</Text>
                  <Text style={styles.chartSub}>Last {lineChartData.length} records • target: {targetWeight} {weightUnit}</Text>
                  
                  <View style={styles.chartWrapper}>
                    <LineChart
                      areaChart
                      curved
                      data={lineChartData}
                      width={screenWidth - 80}
                      height={180}
                      spacing={spacingVal}
                      color={colors.primary}
                      thickness={2.5}
                      startFillColor="rgba(74, 222, 128, 0.15)"
                      endFillColor="rgba(74, 222, 128, 0.0)"
                      startOpacity={0.7}
                      endOpacity={0.0}
                      yAxisColor="transparent"
                      xAxisColor={colors.border}
                      yAxisTextStyle={styles.axisText}
                      xAxisLabelTextStyle={styles.axisText}
                      hideRules
                      hideDataPoints={false}
                      dataPointsColor={colors.primary}
                      dataPointsRadius={4}
                      maxValue={yAxisMax}
                      noOfSections={4}
                      pointerConfig={{
                        pointerStripUptoDataPoint: true,
                        pointerStripColor: colors.textMuted,
                        pointerStripWidth: 1,
                        strokeDashArray: [2, 2],
                        pointerColor: colors.primary,
                        radius: 4,
                        pointerLabelComponent: (items: any) => {
                          return (
                            <View style={styles.tooltip}>
                              <Text style={styles.tooltipVal}>{items[0].value} {weightUnit}</Text>
                              <Text style={styles.tooltipSub}>{items[0].label}</Text>
                            </View>
                          );
                        },
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.text,
    fontSize: 26,
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.sm,
  },
  headerSubtitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  targetDot: {
    color: colors.textMuted,
    fontSize: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    ...typography.labelLarge,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingLeft: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  inputTitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10.5,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  numericInput: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    ...typography.bodyLarge,
    fontFamily: 'Jura-Bold',
    marginBottom: spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  smallInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    ...typography.bodyMedium,
    fontFamily: 'Jura-Bold',
  },
  btnPrimary: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnPrimaryText: {
    ...typography.titleSmall,
    color: colors.background,
  },
  btnSecondary: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  btnSecondaryText: {
    ...typography.titleSmall,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    fontSize: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyDate: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyWeight: {
    ...typography.bodyMedium,
    color: colors.text,
    fontFamily: 'Jura-Bold',
  },
  historyDiff: {
    ...typography.bodySmall,
    fontSize: 11,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: 2,
  },
  chartTitle: {
    ...typography.titleSmall,
    color: colors.text,
  },
  chartSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: spacing.md,
  },
  chartWrapper: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  axisText: {
    ...typography.labelSmall,
    color: colors.textMuted,
    fontSize: 9,
  },
  tooltip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipVal: {
    ...typography.labelSmall,
    color: colors.primary,
    fontFamily: 'Jura-Bold',
    fontSize: 10,
  },
  tooltipSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 8,
  },
});
