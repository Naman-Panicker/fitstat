import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, type Route } from 'react-native-tab-view';
import { colors, spacing, typography } from '@/src/styles/globals';
import MealsLogPage from '@/components/meals/MealsLogPage';
import MealsHistoryPage from '@/components/meals/MealsHistoryPage';
import MealsGraphPage from '@/components/meals/MealsGraphPage';

// ─── Route definitions ───────────────────────────────────────────────────────

const ROUTES: Route[] = [
  { key: 'logs', title: 'LOGS' },
  { key: 'history', title: 'HISTORY' },
  { key: 'graph', title: 'GRAPH' },
];

// ─── Scene renderer ──────────────────────────────────────────────────────────

const renderScene = ({ route }: { route: Route }) => {
  switch (route.key) {
    case 'logs':
      return <MealsLogPage />;
    case 'history':
      return <MealsHistoryPage />;
    case 'graph':
      return <MealsGraphPage />;
    default:
      return null;
  }
};

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────

type TabBarProps = {
  routes: Route[];
  index: number;
  onTabPress: (i: number) => void;
};

function SubTabBar({ routes, index, onTabPress }: TabBarProps) {
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MealsScreen() {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const handleTabPress = useCallback((i: number) => {
    setIndex(i);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Meals</Text>
      </View>

      {/* Sub-tab bar */}
      <SubTabBar routes={ROUTES} index={index} onTabPress={handleTabPress} />

      {/* Swipeable pages */}
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Sub-tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
});
