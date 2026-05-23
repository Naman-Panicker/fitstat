import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/src/styles/globals';
import { getMealLogsByDateRange } from '@/src/db/queries';
import { DEV_USER_ID, MealLog } from '@/src/types';
import { LineChart } from 'react-native-gifted-charts';
import { PolarChart, Pie } from 'victory-native';

const screenWidth = Dimensions.get('window').width;

type TimeRange = '7D' | '30D' | '3M' | 'ALL';

export default function MealsGraphPage() {
  const db = useSQLiteContext();
  const [range, setRange] = useState<TimeRange>('7D');
  const [loading, setLoading] = useState(true);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);

  // ─── Range calculation helpers ──────────────────────────────────────────────
  const todayStr = useCallback((): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const getStartDateForRange = useCallback((selectedRange: TimeRange): string => {
    const d = new Date();
    if (selectedRange === '7D') {
      d.setDate(d.getDate() - 6);
    } else if (selectedRange === '30D') {
      d.setDate(d.getDate() - 29);
    } else if (selectedRange === '3M') {
      d.setDate(d.getDate() - 90);
    } else {
      return '2020-01-01'; // Fetch all logs since 2020 to find the oldest
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    try {
      const end = todayStr();
      // Always fetch complete history since 2020 so we can determine the absolute first record date
      const data = await getMealLogsByDateRange(db, DEV_USER_ID, '2020-01-01', end);
      setMealLogs(data);
    } catch (e) {
      console.error('Failed to fetch meal logs for graphing:', e);
    } finally {
      setLoading(false);
    }
  }, [db, todayStr]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // ─── Data processing for Calorie Trend Line Chart ──────────────────────────
  const lineChartData = React.useMemo(() => {
    const end = todayStr();
    const rangeStartDate = getStartDateForRange(range);

    // Find the absolute oldest calorie log in the database
    const oldestLoggedDate = mealLogs.length > 0 ? mealLogs[mealLogs.length - 1].loggedAt : end;

    // Cap the start date of the timeline so it never starts before the user's first record
    const start = range === 'ALL' ? oldestLoggedDate : (oldestLoggedDate > rangeStartDate ? oldestLoggedDate : rangeStartDate);

    // Generate consecutive dates list
    const datesList: string[] = [];
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      datesList.push(
        `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
      );
      current.setDate(current.getDate() + 1);
    }

    // Map logs to daily calories
    const calorieMap = new Map<string, number>();
    for (const log of mealLogs) {
      const dateKey = log.loggedAt;
      const currentCal = calorieMap.get(dateKey) || 0;
      calorieMap.set(dateKey, currentCal + log.food.calories * log.servings);
    }

    // Map back to Gifted Charts expected format
    return datesList.map((dateStr, index) => {
      const val = Math.round(calorieMap.get(dateStr) || 0);
      const [,, dPart] = dateStr.split('-');
      const d = new Date(dateStr);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const monthOnly = d.toLocaleDateString('en-US', { month: 'short' });

      // Determine label based on range intervals to prevent clutter
      let shouldShowLabel = false;
      if (range === '7D') {
        shouldShowLabel = true;
      } else if (range === '30D') {
        shouldShowLabel = index % 5 === 0 || index === datesList.length - 1;
      } else if (range === '3M') {
        shouldShowLabel = index % 14 === 0 || index === datesList.length - 1;
      } else if (range === 'ALL') {
        shouldShowLabel = d.getDate() === 1 || index === 0 || index === datesList.length - 1;
      }

      // Display short month for ALL first-of-month changes, date numbers for 30D/3M/7D boundaries
      let labelText = '';
      if (shouldShowLabel) {
        if (range === 'ALL') {
          labelText = monthOnly;
        } else if (range === '7D') {
          labelText = monthLabel;
        } else {
          labelText = dPart; // Show day of month (e.g. "15")
        }
      }

      return {
        value: val,
        label: labelText,
        dateLabel: monthLabel,
      };
    });
  }, [mealLogs, range, todayStr, getStartDateForRange]);

  // Dynamic spacing so chart fits elegantly without collapsing
  const spacingVal = React.useMemo(() => {
    if (lineChartData.length <= 1) return 180;
    if (range === '7D') return 44;
    if (range === '30D') return 10;
    return Math.max(3.5, Math.min(10, (screenWidth - 72) / (lineChartData.length - 1 || 1)));
  }, [lineChartData, range]);

  // ─── Data processing for Macronutrient Pie / Donut Chart ───────────────────
  const { pieData, macroBreakdown, totalCalories } = React.useMemo(() => {
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;
    let calSum = 0;

    const end = todayStr();
    const rangeStartDate = getStartDateForRange(range);
    const oldestLoggedDate = mealLogs.length > 0 ? mealLogs[mealLogs.length - 1].loggedAt : end;
    const start = range === 'ALL' ? oldestLoggedDate : (oldestLoggedDate > rangeStartDate ? oldestLoggedDate : rangeStartDate);

    for (const log of mealLogs) {
      if (log.loggedAt >= start) {
        const factor = log.servings;
        totalP += log.food.protein * factor;
        totalC += log.food.carbs * factor;
        totalF += log.food.fat * factor;
        calSum += log.food.calories * factor;
      }
    }

    // Calorie equivalents
    const calP = totalP * 4;
    const calC = totalC * 4;
    const calF = totalF * 9;
    const calculatedTotalCal = calP + calC + calF;

    const dataset = [
      { label: 'Protein', value: calP > 0 ? calP : 1, color: colors.proteinColor },
      { label: 'Carbs', value: calC > 0 ? calC : 1, color: colors.carbColor },
      { label: 'Fat', value: calF > 0 ? calF : 1, color: colors.fatColor },
    ];

    return {
      pieData: dataset,
      totalCalories: Math.round(calSum),
      macroBreakdown: {
        protein: { grams: Math.round(totalP), cal: Math.round(calP), pct: calculatedTotalCal > 0 ? Math.round((calP / calculatedTotalCal) * 100) : 0 },
        carbs: { grams: Math.round(totalC), cal: Math.round(calC), pct: calculatedTotalCal > 0 ? Math.round((calC / calculatedTotalCal) * 100) : 0 },
        fat: { grams: Math.round(totalF), cal: Math.round(calF), pct: calculatedTotalCal > 0 ? Math.round((calF / calculatedTotalCal) * 100) : 0 },
      },
    };
  }, [mealLogs, range, getStartDateForRange, todayStr]);

  // Daily average for selection range
  const dailyAverageCal = React.useMemo(() => {
    if (lineChartData.length === 0) return 0;
    const sum = lineChartData.reduce((acc, point) => acc + point.value, 0);
    return Math.round(sum / lineChartData.length);
  }, [lineChartData]);

  // Determine standard grid intervals based on data
  const maxCalVal = Math.max(...lineChartData.map((d) => d.value), 2000);
  const yAxisMax = Math.ceil(maxCalVal / 500) * 500;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Calorie History Area Chart */}
          <View style={styles.card}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.cardLabel}>CALORIE TREND</Text>
                <Text style={styles.cardHighlight}>{dailyAverageCal} kcal / day</Text>
                <Text style={styles.cardSubtext}>Average for {range === '7D' ? 'last 7 days' : range === '30D' ? 'last 30 days' : range === '3M' ? 'last 3 months' : 'selected range'}</Text>
              </View>
              <Ionicons name="trending-up-outline" size={24} color={colors.textSecondary} />
            </View>

            <View style={styles.chartWrapper}>
              <LineChart
                areaChart
                curved
                data={lineChartData}
                width={screenWidth - 72}
                height={160}
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
                hideDataPoints
                maxValue={yAxisMax}
                noOfSections={4}
                pointerConfig={{
                  pointerStripUptoDataPoint: true,
                  pointerStripColor: colors.textMuted,
                  pointerStripWidth: 1,
                  strokeDashArray: [2, 4],
                  pointerColor: colors.primary,
                  radius: 4,
                  pointerVanishDelay: 3500, // Tooltip stays visible for 3.5 seconds after touch ends
                  pointerLabelComponent: (items: any) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <View style={styles.tooltip}>
                        <Text style={styles.tooltipTitle}>{items[0].dateLabel}</Text>
                        <Text style={styles.tooltipVal}>{items[0].value} kcal</Text>
                      </View>
                    );
                  },
                }}
              />
            </View>
          </View>

          {/* Macronutrient Calorie Donut Chart */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MACRONUTRIENT BREAKDOWN</Text>
            {totalCalories === 0 ? (
              <View style={styles.emptyChartContainer}>
                <Ionicons name="pie-chart-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyChartText}>No meals logged in this range</Text>
              </View>
            ) : (
              <View style={styles.donutContainer}>
                {/* Centered & Enlarged Victory Donut Chart */}
                <View style={styles.donutWrapperCentered}>
                  <View style={styles.pieWrapper}>
                    <PolarChart
                      data={pieData}
                      labelKey="label"
                      valueKey="value"
                      colorKey="color"
                    >
                      <Pie.Chart innerRadius="70%" />
                    </PolarChart>
                    
                    {/* Center Text inside Donut Ring */}
                    <View style={styles.donutCenter}>
                      <Text style={styles.donutCenterLabel}>TOTAL</Text>
                      <Text style={styles.donutCenterVal}>{totalCalories}</Text>
                      <Text style={styles.donutCenterSub}>kcal</Text>
                    </View>
                  </View>
                </View>

                {/* Custom Legend - Stacked elegantly below the centered pie */}
                <View style={styles.legendContainer}>
                  {/* Protein Row */}
                  <View style={styles.legendItem}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.indicator, { backgroundColor: colors.proteinColor }]} />
                      <Text style={styles.legendText}>Protein</Text>
                    </View>
                    <View style={styles.legendRight}>
                      <Text style={styles.legendGrams}>{macroBreakdown.protein.grams}g</Text>
                      <Text style={styles.legendPct}>{macroBreakdown.protein.pct}%</Text>
                    </View>
                  </View>

                  {/* Carbs Row */}
                  <View style={styles.legendItem}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.indicator, { backgroundColor: colors.carbColor }]} />
                      <Text style={styles.legendText}>Carbs</Text>
                    </View>
                    <View style={styles.legendRight}>
                      <Text style={styles.legendGrams}>{macroBreakdown.carbs.grams}g</Text>
                      <Text style={styles.legendPct}>{macroBreakdown.carbs.pct}%</Text>
                    </View>
                  </View>

                  {/* Fat Row */}
                  <View style={styles.legendItem}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.indicator, { backgroundColor: colors.fatColor }]} />
                      <Text style={styles.legendText}>Fat</Text>
                    </View>
                    <View style={styles.legendRight}>
                      <Text style={styles.legendGrams}>{macroBreakdown.fat.grams}g</Text>
                      <Text style={styles.legendPct}>{macroBreakdown.fat.pct}%</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingContainer: {
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  selectorBtnContainer: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  selectorBtnActiveContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  selectorActiveText: {
    color: colors.primary,
    fontFamily: 'Jura-Bold',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  chartWrapper: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginLeft: -10, // Offset internal line chart padding
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
    minWidth: 80,
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
  donutContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  donutWrapperCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: spacing.sm,
  },
  pieWrapper: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    ...typography.labelSmall,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  donutCenterVal: {
    ...typography.displayMedium,
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    marginTop: 2,
  },
  donutCenterSub: {
    ...typography.labelSmall,
    color: colors.textMuted,
    fontSize: 10,
  },
  legendContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.sm,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontFamily: 'Jura-Bold',
    fontSize: 14,
  },
  legendRight: {
    alignItems: 'flex-end',
  },
  legendGrams: {
    ...typography.bodyMedium,
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Jura-Bold',
  },
  legendPct: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl + 10,
    gap: spacing.sm,
  },
  emptyChartText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
});
