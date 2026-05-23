import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { LineChart } from 'react-native-gifted-charts';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { getUserPreference, getExerciseHistory } from '@/src/db/queries';
import { DEV_USER_ID } from '@/src/types';

const screenWidth = Dimensions.get('window').width;

type TimeRange = '7D' | '30D' | '3M' | 'ALL';
type MetricType = 'max_weight' | 'est_1rm' | 'max_volume';

interface WorkoutGraphTabProps {
  exerciseId: string;
}

export default function WorkoutGraphTab({ exerciseId }: WorkoutGraphTabProps) {
  const db = useSQLiteContext();
  const [range, setRange] = useState<TimeRange>('30D');
  const [metric, setMetric] = useState<MetricType>('max_weight');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [history, setHistory] = useState<{ date: string; sets: { id: string; weight: number; reps: number; createdAt: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const userUnit = await getUserPreference(db, 'workout_unit');
        if (isMounted && (userUnit === 'metric' || userUnit === 'imperial')) {
          setUnit(userUnit);
        }
        
        const rawHistory = await getExerciseHistory(db, DEV_USER_ID, exerciseId);
        if (isMounted) {
          setHistory(rawHistory);
        }
      } catch (e) {
        console.error("Failed to load exercise history for charting:", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [db, exerciseId]);

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];

    // Find the absolute oldest completed session date for this exercise
    const oldestSessionDate = history[history.length - 1].date;

    const limitDate = new Date();
    if (range === '7D') {
      limitDate.setDate(limitDate.getDate() - 6);
    } else if (range === '30D') {
      limitDate.setDate(limitDate.getDate() - 29);
    } else if (range === '3M') {
      limitDate.setDate(limitDate.getDate() - 90);
    } else {
      // ALL range starts exactly on the oldest date
      return history;
    }

    const targetDateStr = `${limitDate.getFullYear()}-${String(limitDate.getMonth() + 1).padStart(2, '0')}-${String(limitDate.getDate()).padStart(2, '0')}`;
    
    // Cap the range start date to the oldest logged session date so it never draws empty days before it!
    const activeStartDateStr = oldestSessionDate > targetDateStr ? oldestSessionDate : targetDateStr;

    return history.filter((item) => item.date >= activeStartDateStr);
  }, [history, range]);

  const chartData = useMemo(() => {
    // Sort chronological first so index-based grouping is 100% correct
    const sorted = [...filteredHistory].sort((a, b) => a.date.localeCompare(b.date));

    return sorted.map((item, index) => {
      let value = 0;
      if (metric === 'max_weight') {
        value = Math.max(...item.sets.map((s) => s.weight));
      } else if (metric === 'est_1rm') {
        value = Math.max(...item.sets.map((s) => s.weight * (1 + s.reps / 30)));
      } else {
        value = Math.max(...item.sets.map((s) => s.weight * s.reps));
      }

      // Convert weights based on preferences
      if (unit === 'imperial') {
        value = value * 2.20462;
      }
      value = Math.round(value * 10) / 10;

      const d = new Date(item.date);
      const monthOnly = d.toLocaleDateString('en-US', { month: 'short' });
      const [, m, dayStr] = item.date.split('-');
      const defaultLabel = `${m}/${dayStr}`;

      // Determine label based on range intervals to prevent clutter
      let shouldShowLabel = false;
      if (range === '7D') {
        shouldShowLabel = true;
      } else if (range === '30D') {
        shouldShowLabel = index % 5 === 0 || index === sorted.length - 1;
      } else if (range === '3M') {
        shouldShowLabel = index % 14 === 0 || index === sorted.length - 1;
      } else if (range === 'ALL') {
        shouldShowLabel = d.getDate() === 1 || index === 0 || index === sorted.length - 1;
      }

      let labelText = '';
      if (shouldShowLabel) {
        if (range === 'ALL') {
          labelText = monthOnly;
        } else {
          labelText = defaultLabel;
        }
      }

      return {
        value,
        label: labelText,
        fullDate: item.date,
      };
    });
  }, [filteredHistory, metric, range, unit]);

  const spacingVal = useMemo(() => {
    if (chartData.length <= 1) return 180;
    if (chartData.length < 5) return 80;
    return Math.max(30, Math.min(70, (screenWidth - 76) / (chartData.length - 1)));
  }, [chartData]);

  const unitLabel = useMemo(() => {
    return unit === 'imperial' ? 'lbs' : 'kg';
  }, [unit]);

  const metricLabel = useMemo(() => {
    if (metric === 'max_weight') return 'Max Weight';
    if (metric === 'est_1rm') return 'Estimated 1RM';
    return 'Max Set Volume';
  }, [metric]);

  const bestVal = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map((d) => d.value));
  }, [chartData]);

  if (loading) {
    return (
      <View style={styles.placeholderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabScroll} contentContainerStyle={styles.graphScrollContent} showsVerticalScrollIndicator={false}>
      {/* Time Range Selector */}
      <View style={styles.selectorBar}>
        {(['7D', '30D', '3M', 'ALL'] as TimeRange[]).map((r) => (
          <Pressable
            key={r}
            style={
              range === r
                ? {
                    flex: 1,
                    borderRadius: 4,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : {
                    flex: 1,
                    borderRadius: 4,
                    backgroundColor: 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
            }
            onPress={() => setRange(r)}
          >
            <Text
              style={
                range === r
                  ? {
                      fontFamily: 'Jura-Bold',
                      fontSize: 13,
                      color: colors.primary,
                      textAlign: 'center',
                      paddingVertical: spacing.sm,
                    }
                  : {
                      fontFamily: 'Jura-Medium',
                      fontSize: 13,
                      color: colors.textSecondary,
                      textAlign: 'center',
                      paddingVertical: spacing.sm,
                    }
              }
            >
              {r}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Performance Metric Selector */}
      <View style={styles.metricSelector}>
        {(['max_weight', 'est_1rm', 'max_volume'] as MetricType[]).map((m) => {
          const mLabel = m === 'max_weight' ? 'MAX WEIGHT' : m === 'est_1rm' ? 'EST. 1RM' : 'MAX SET VOL';
          const isActive = metric === m;
          return (
            <Pressable
              key={m}
              style={
                isActive
                  ? {
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: 4,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }
                  : {
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: 4,
                      backgroundColor: 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }
              }
              onPress={() => setMetric(m)}
            >
              <Text
                style={
                  isActive
                    ? {
                        color: colors.primary,
                        fontFamily: 'Jura-Bold',
                        fontSize: 10,
                        letterSpacing: 0.5,
                      }
                    : {
                        color: colors.textSecondary,
                        fontFamily: 'Jura-Medium',
                        fontSize: 10,
                        letterSpacing: 0.5,
                      }
                }
              >
                {mLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {chartData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyText}>No logs found in this range</Text>
        </View>
      ) : (
        <View style={styles.chartContainer}>
          <View style={{ width: '100%', marginBottom: spacing.md }}>
            <Text style={styles.cardLabel}>{metricLabel.toUpperCase()}</Text>
            <Text style={styles.cardHighlight}>
              {bestVal} <Text style={{ fontSize: 13, color: colors.textSecondary }}>{unitLabel}</Text>
            </Text>
            <Text style={styles.cardSubtext}>Peak value achieved in selected range</Text>
          </View>

          <View style={styles.chartInnerWrapper}>
            <LineChart
              areaChart
              curved
              data={chartData}
              width={screenWidth - 80}
              height={180}
              spacing={spacingVal}
              color={colors.primary}
              thickness={2}
              startFillColor="rgba(255, 255, 255, 0.15)"
              endFillColor="rgba(255, 255, 255, 0.0)"
              startOpacity={0.8}
              endOpacity={0.0}
              yAxisColor="transparent"
              xAxisColor={colors.border}
              yAxisTextStyle={styles.axisLabel}
              xAxisLabelTextStyle={styles.axisLabel}
              hideRules
              hideDataPoints={chartData.length === 1 ? false : true}
              dataPointsColor={colors.primary}
              dataPointsRadius={4}
              focusedDataPointColor={colors.primary}
              focusedDataPointRadius={5}
              noOfSections={4}
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: colors.textMuted,
                pointerStripWidth: 1,
                strokeDashArray: [2, 4],
                pointerColor: colors.primary,
                radius: 4,
                pointerVanishDelay: 3500,
                pointerLabelComponent: (items: any) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipTitle}>{items[0].label}</Text>
                      <Text style={styles.tooltipVal}>{items[0].value} {unitLabel}</Text>
                    </View>
                  );
                },
              }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabScroll: {
    flex: 1,
  },
  graphScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  selectorBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  metricSelector: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  chartInnerWrapper: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginLeft: -10,
  },
  cardLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardHighlight: {
    ...typography.displayMedium,
    color: colors.text,
    fontSize: 22,
    marginTop: 4,
  },
  cardSubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  axisLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: 'Jura-Regular',
  },
  tooltip: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 85,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipTitle: {
    ...typography.labelSmall,
    fontSize: 9,
    color: colors.textSecondary,
  },
  tooltipVal: {
    ...typography.titleSmall,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
});
