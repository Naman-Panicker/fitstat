import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { DEV_USER_ID } from '@/src/types';
import { colors, spacing, typography } from '@/src/styles/globals';
import {
  DaySummary,
  getLoggedDates,
  getMealLogsByDateRange,
  groupLogsByDay,
} from '@/src/db/queries';
import HistoryDayCard from './HistoryDayCard';

const PAGE_SIZE = 7;

// ─── State ────────────────────────────────────────────────────────────────────

type State = {
  days: DaySummary[];
  cursor: string | null; // oldest loaded date — next fetch goes before this
  hasMore: boolean;
  isLoading: boolean;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { newDays: DaySummary[]; oldestDate: string | null; hasMore: boolean } }
  | { type: 'FETCH_ERROR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true };
    case 'FETCH_SUCCESS':
      return {
        days: [...state.days, ...action.payload.newDays],
        cursor: action.payload.oldestDate,
        hasMore: action.payload.hasMore,
        isLoading: false,
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tomorrow's date string — so the first fetch includes today. */
function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MealsHistoryPage() {
  const db = useSQLiteContext();
  const isFetchingRef = useRef(false);
  const [state, dispatch] = useReducer(reducer, {
    days: [],
    cursor: null,
    hasMore: true,
    isLoading: false,
  });

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !state.hasMore) return;

    isFetchingRef.current = true;
    dispatch({ type: 'FETCH_START' });

    try {
      const beforeDate = state.cursor ?? tomorrowStr();
      const dates = await getLoggedDates(db, DEV_USER_ID, beforeDate, PAGE_SIZE);

      if (dates.length === 0) {
        dispatch({
          type: 'FETCH_SUCCESS',
          payload: { newDays: [], oldestDate: state.cursor, hasMore: false },
        });
        isFetchingRef.current = false;
        return;
      }

      const oldestDate = dates[dates.length - 1];
      const newestDate = dates[0];

      const logs = await getMealLogsByDateRange(db, DEV_USER_ID, oldestDate, newestDate);
      const newDays = groupLogsByDay(logs);

      // Filter out any potential duplicate dates that might somehow already exist
      const existingDates = new Set(state.days.map((d) => d.date));
      const filteredNewDays = newDays.filter((d) => !existingDates.has(d.date));

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: {
          newDays: filteredNewDays,
          oldestDate,
          hasMore: dates.length >= PAGE_SIZE,
        },
      });
    } catch (e) {
      console.error('History fetch failed:', e);
      dispatch({ type: 'FETCH_ERROR' });
    } finally {
      isFetchingRef.current = false;
    }
  }, [db, state.cursor, state.hasMore, state.days]);

  // Initial load
  useEffect(() => {
    loadMore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = useCallback(
    ({ item }: { item: DaySummary }) => <HistoryDayCard day={item} />,
    []
  );

  const renderFooter = () => {
    if (state.isLoading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (!state.hasMore && state.days.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.endText}>That's all your history</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmpty = () => {
    if (state.isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No meal history yet</Text>
        <Text style={styles.emptySubtext}>Start logging meals to see your history here</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={state.days}
      keyExtractor={(item) => item.date}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  endText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.titleMedium,
    color: colors.textSecondary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
