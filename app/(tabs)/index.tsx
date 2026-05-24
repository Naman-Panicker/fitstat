import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '@/components/HomeHeader';
import CalorieRing from '@/components/ui/CalorieRing';
import MacroBar from '@/components/ui/MacroBar';
import { colors, globalStyles, radius, spacing, typography } from '@/src/styles/globals';
import { useMeals } from '@/src/context/MealsContext';
import { DAILY_GOALS } from '@/src/data/mockData';
import { MealType } from '@/src/types';

const screenWidth = Dimensions.get('window').width;

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export default function HomeScreen() {
  const router = useRouter();
  const { getMealCalories, getTotals } = useMeals();
  const totals = getTotals();

  // Notification modal visibility state
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  const handleAddMeal = (mealType?: MealType) => {
    router.push({ pathname: '/add-meal', params: mealType ? { mealType } : {} });
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* Brand Top Bar */}
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.headerTitleRow, pressed && { opacity: 0.7 }]}>
          <Text style={styles.headerTitle}>Home</Text>
        </Pressable>

        {/* Top Right Header Actions */}
        <View style={styles.headerActions}>
          {/* Streak Action */}
          <Pressable
            style={({ pressed }) => [styles.streakContainer, pressed && { opacity: 0.7 }]}
            onPress={() => Alert.alert('Active Streak', 'You have logged data for 3 consecutive days! Keep it up!')}
          >
            <Ionicons name="flame" size={20} color="#fb923c" />
            <Text style={styles.streakText}>3</Text>
          </Pressable>

          {/* Notifications Action */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setNotificationsModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            <View style={styles.dotBadge} />
          </Pressable>

          {/* Profile Action */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[globalStyles.scrollContent, { paddingTop: spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />

        {/* Calorie Ring Card */}
        <View style={styles.ringCard}>
          <CalorieRing
            value={totals.calories}
            goal={DAILY_GOALS.calories}
            size={200}
            strokeWidth={18}
          />

          {/* Macro Progress Bars */}
          <View style={styles.macroBarsContainer}>
            <MacroBar
              label="Protein"
              value={totals.protein}
              goal={DAILY_GOALS.protein}
              color={colors.proteinColor}
              noMargin
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs}
              goal={DAILY_GOALS.carbs}
              color={colors.carbColor}
              noMargin
            />
            <MacroBar
              label="Fat"
              value={totals.fat}
              goal={DAILY_GOALS.fat}
              color={colors.fatColor}
              noMargin
            />
            <MacroBar
              label="Fiber"
              value={totals.fiber}
              goal={DAILY_GOALS.fiber}
              color={colors.fiberColor}
              noMargin
            />
          </View>
        </View>

        {/* Today's Meals Summary */}
        <Text style={globalStyles.sectionTitle}>Today's Meals</Text>

        {MEAL_ORDER.map((mealType) => {
          const cal = getMealCalories(mealType);
          return (
            <View key={mealType} style={styles.mealRow}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealLabel}>{MEAL_LABELS[mealType]}</Text>
                <Text style={styles.mealCal}>
                  {cal > 0 ? `${cal} kcal` : 'Not logged'}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                onPress={() => handleAddMeal(mealType)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* Centered Notifications Alert Overlay */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notificationsModalVisible}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNotificationsModalVisible(false)}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>System Alerts</Text>
              <Pressable onPress={() => setNotificationsModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.notificationList}>
              <View style={styles.notificationItem}>
                <Ionicons name="flame" size={18} color="#fb923c" />
                <View style={styles.notificationTextCol}>
                  <Text style={styles.notificationItemTitle}>Streak Alert!</Text>
                  <Text style={styles.notificationItemDesc}>Maintain your streak by logging meals today.</Text>
                </View>
              </View>

              <View style={styles.notificationItem}>
                <Ionicons name="cloud-done" size={18} color={colors.success} />
                <View style={styles.notificationTextCol}>
                  <Text style={styles.notificationItemTitle}>Cloud Engine Active</Text>
                  <Text style={styles.notificationItemDesc}>Cloud migration pipeline initialized & persistent.</Text>
                </View>
              </View>

              <View style={styles.notificationItem}>
                <Ionicons name="shield-checkmark" size={18} color={colors.proteinColor} />
                <View style={styles.notificationTextCol}>
                  <Text style={styles.notificationItemTitle}>Offline-First Mode</Text>
                  <Text style={styles.notificationItemDesc}>Data saved securely in local SQLite storage.</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ringCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  streakText: {
    ...typography.labelSmall,
    color: '#fb923c',
    fontFamily: 'Jura-Bold',
    fontSize: 12,
  },
  iconBtn: {
    position: 'relative',
    padding: 2,
  },
  dotBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.alert,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.text,
    fontSize: 26,
    letterSpacing: 0.5,
  },
  chevronIcon: {
    marginTop: 4,
  },
  
  // Notification Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    width: screenWidth - spacing.xl * 2,
    maxHeight: '60%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  notificationTitle: {
    ...typography.titleMedium,
    color: colors.text,
  },
  notificationList: {
    gap: spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  notificationTextCol: {
    flex: 1,
    gap: 2,
  },
  notificationItemTitle: {
    ...typography.titleSmall,
    color: colors.text,
    fontSize: 13,
  },
  notificationItemDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  macroBarsContainer: {
    width: '100%',
    gap: spacing.xs,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  mealLeft: {
    gap: 2,
  },
  mealLabel: {
    ...typography.titleSmall,
    color: colors.text,
  },
  mealCal: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  addBtnText: {
    ...typography.labelLarge,
    color: colors.primary,
  },
});
