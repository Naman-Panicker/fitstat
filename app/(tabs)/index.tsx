import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '@/components/HomeHeader';
import CalorieRing from '@/components/ui/CalorieRing';
import { colors, globalStyles, radius, spacing, typography } from '@/src/styles/globals';
import { useMeals } from '@/src/context/MealsContext';
import { DAILY_GOALS } from '@/src/data/mockData';
import { MealType } from '@/src/types';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/src/context/AuthContext';
import { calculateActiveLoggingStreak, fetchUserNotifications, clearAllNotifications, syncSystemNotifications, SystemNotification } from '@/src/db/queries';
import { useIsFocused } from '@react-navigation/native';

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
  const db = useSQLiteContext();
  const { userId, session } = useAuth();
  const isFocused = useIsFocused();

  // Streak state
  const [streakData, setStreakData] = useState<{ streakCount: number; isActive: boolean }>({
    streakCount: 0,
    isActive: false,
  });

  // Notifications state
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Dynamic Calorie Goal state
  const [calorieGoal, setCalorieGoal] = useState(2000);

  // Fetch streak and notifications whenever screen gains focus
  useEffect(() => {
    if (isFocused) {
      async function loadData() {
        if (!userId) return;
        const data = await calculateActiveLoggingStreak(db, userId);
        setStreakData(data);

        // Sync and fetch dynamic system notifications
        await syncSystemNotifications(db, userId, session !== null);
        const list = await fetchUserNotifications(db, userId);
        setNotifications(list);

        // Fetch dynamic calorie goal preference
        try {
          const prefRows = await db.getAllAsync<{ key: string; value: string }>(
            "SELECT key, value FROM user_preferences WHERE user_id = ? AND key = 'calorie_goal'",
            userId
          );
          if (prefRows.length > 0) {
            setCalorieGoal(parseInt(prefRows[0].value) || 2000);
          }
        } catch (e) {
          console.error('Failed to load calorie goal:', e);
        }
      }
      loadData();
    }
  }, [isFocused, db, userId, session]);

  const handleClearAll = async () => {
    await clearAllNotifications(db, userId);
    setNotifications([]);
  };

  const handleStreakPress = () => {
    if (streakData.isActive) {
      Alert.alert(
        'Active Streak! 🔥',
        `You have logged your meals or workouts for ${streakData.streakCount} consecutive days! Keep up the incredible momentum!`
      );
    } else if (streakData.streakCount === 1) {
      Alert.alert(
        'Streak Progress ⚡',
        'You have logged for 1 day! Log a meal or workout tomorrow to officially activate your consecutive-day streak!'
      );
    } else {
      Alert.alert(
        'No Active Streak :(',
        'Log a workout or a meal today to start building your daily streak!'
      );
    }
  };

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
            style={({ pressed }) => [
              styles.streakContainer,
              streakData.isActive && { borderColor: 'rgba(251, 146, 60, 0.4)' },
              pressed && { opacity: 0.7 }
            ]}
            onPress={handleStreakPress}
          >
            <Ionicons
              name="flame"
              size={20}
              color={streakData.isActive ? '#fb923c' : colors.textSecondary}
            />
            <Text style={[styles.streakText, !streakData.isActive && { color: colors.textSecondary }]}>
              {streakData.streakCount}
            </Text>
          </Pressable>

          {/* Notifications Action */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setNotificationsModalVisible(true)}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {notifications.length > 0 && <View style={styles.dotBadge} />}
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
            goal={calorieGoal}
            size={200}
            strokeWidth={18}
          />

          {/* Macro Bento Grid */}
          <View style={styles.macroGrid}>
            <View style={styles.macroGridCard}>
              <Text style={styles.gridCardLabel}>Protein</Text>
              <Text style={[styles.gridCardValue, { color: colors.proteinColor }]}>{Math.round(totals.protein)} g</Text>
            </View>
            <View style={styles.macroGridCard}>
              <Text style={styles.gridCardLabel}>Carbs</Text>
              <Text style={[styles.gridCardValue, { color: colors.carbColor }]}>{Math.round(totals.carbs)} g</Text>
            </View>
            <View style={styles.macroGridCard}>
              <Text style={styles.gridCardLabel}>Fat</Text>
              <Text style={[styles.gridCardValue, { color: colors.fatColor }]}>{Math.round(totals.fat)} g</Text>
            </View>
            <View style={styles.macroGridCard}>
              <Text style={styles.gridCardLabel}>Fiber</Text>
              <Text style={[styles.gridCardValue, { color: colors.fiberColor }]}>{Math.round(totals.fiber)} g</Text>
            </View>
          </View>
        </View>

        {/* Today's Meals Summary */}
        <Text style={globalStyles.sectionTitle}>{"Today's Meals"}</Text>

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {notifications.length > 0 && (
                  <Pressable onPress={handleClearAll} style={{ marginRight: 2 }}>
                    <Text style={{ ...typography.labelSmall, color: colors.alert, fontSize: 11, fontFamily: 'Jura-Bold' }}>
                      Clear All
                    </Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setNotificationsModalVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.notificationList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} style={{ marginBottom: spacing.xs }} />
                  <Text style={styles.emptyText}>You are all caught up!</Text>
                </View>
              ) : (
                notifications.map((notif) => {
                  let iconName = 'notifications-outline';
                  let iconColor = colors.primary;

                  if (notif.type === 'streak') {
                    iconName = 'flame';
                    iconColor = '#fb923c';
                  } else if (notif.type === 'sync') {
                    iconName = 'cloud-done-outline';
                    iconColor = colors.alert;
                  } else if (notif.type === 'workout') {
                    iconName = 'barbell';
                    iconColor = colors.success;
                  } else if (notif.type === 'meal') {
                    iconName = 'restaurant';
                    iconColor = colors.proteinColor;
                  }

                  return (
                    <View key={notif.id} style={styles.notificationItem}>
                      <Ionicons name={iconName as any} size={18} color={iconColor} style={styles.notifIcon} />
                      <View style={styles.notificationTextCol}>
                        <Text style={styles.notificationItemTitle}>{notif.title}</Text>
                        <Text style={styles.notificationItemDesc}>{notif.description}</Text>
                      </View>
                    </View>
                  );
                })
              )}
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
    width: screenWidth - spacing.lg * 2,
    maxHeight: '65%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: spacing.lg,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: spacing.md,
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
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  notifIcon: {
    alignSelf: 'center',
  },
  notificationTextCol: {
    flex: 1,
    gap: 4,
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
    lineHeight: 15,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
    fontSize: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.md + 4,
    gap: spacing.sm,
  },
  macroGridCard: {
    width: '47.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gridCardValue: {
    ...typography.titleLarge,
    fontFamily: 'Jura-Bold',
    fontSize: 16,
    marginTop: 2,
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
