import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/styles/globals';

export default function WorkoutsScreen() {
  const handleAction = (actionName: string) => {
    Alert.alert('Workouts', `${actionName} feature coming soon!`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Visual Navigation Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/images/fitstat_logo.png')}
            style={styles.appIcon}
            resizeMode="cover"
          />
          <Text style={styles.brandName}>FitStat</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => handleAction('Calendar')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="calendar-sharp" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('Add')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="add" size={24} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('Options')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="ellipsis-vertical-sharp" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Date Switcher Subheader */}
      <View style={styles.subHeader}>
        <Pressable style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back-sharp" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.dateTitle}>TODAY</Text>
        <Pressable style={({ pressed }) => [styles.arrowBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-forward-sharp" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Empty State Body Content */}
      <View style={styles.body}>
        <Text style={styles.emptyText}>Workout Log Empty</Text>
      </View>

      {/* Bottom Action Controls */}
      <View style={styles.bottomActions}>
        <Pressable
          style={({ pressed }) => [styles.actionBlock, pressed && { opacity: 0.75 }]}
          onPress={() => handleAction('Start New Workout')}
        >
          <Ionicons name="add" size={32} color={colors.primary} />
          <Text style={styles.actionText}>Start New Workout</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionBlock, pressed && { opacity: 0.75 }]}
          onPress={() => handleAction('Copy Previous Workout')}
        >
          <Ionicons name="copy-outline" size={28} color={colors.primary} />
          <Text style={styles.actionText}>Copy Previous Workout</Text>
        </Pressable>
      </View>
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
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  appIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
  },
  brandName: {
    ...typography.titleLarge,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    padding: 2,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  arrowBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dateTitle: {
    ...typography.titleMedium,
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '400',
    opacity: 0.8,
  },
  bottomActions: {
    paddingBottom: spacing.xl + 10,
    alignItems: 'center',
    gap: spacing.lg + 4,
  },
  actionBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
    marginTop: 2,
  },
});
