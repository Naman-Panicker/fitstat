import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, radius, spacing, typography } from '@/src/styles/globals';
import { MuscleGroup, Exercise, DEV_USER_ID } from '@/src/types';
import { getExercisesByMuscleGroup, addCustomExercise } from '@/src/db/queries';

export default function SelectExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ muscle: MuscleGroup; label: string }>();
  const db = useSQLiteContext();

  const muscleGroup = params.muscle ?? 'chest';
  const muscleLabel = params.label ?? 'Chest';

  const [search, setSearch] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Custom exercise modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getExercisesByMuscleGroup(db, muscleGroup);
      setExercises(data);
    } catch (e) {
      console.error('Failed to fetch exercises:', e);
    } finally {
      setIsLoading(false);
    }
  }, [db, muscleGroup]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [search, exercises]);

  // Handle adding a new exercise
  const handleAddNew = async () => {
    if (!newExerciseName.trim()) return;

    setIsSubmitting(true);
    try {
      const newEx = await addCustomExercise(
        db,
        DEV_USER_ID,
        newExerciseName.trim(),
        muscleGroup
      );
      setExercises((prev) => [...prev, newEx]);
      setModalVisible(false);
      setNewExerciseName('');
    } catch (e) {
      console.error('Failed to add custom exercise:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{muscleLabel} Exercises</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${muscleLabel.toLowerCase()} exercise...`}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Exercises List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredExercises.map((ex) => (
            <Pressable
              key={ex.id}
              style={({ pressed }) => [
                styles.exerciseItem,
                pressed && styles.exerciseItemPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/workout/track-exercise',
                  params: { exerciseId: ex.id, exerciseName: ex.name },
                })
              }
            >
              <View style={styles.exerciseLeft}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                {ex.userId && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>Custom</Text>
                  </View>
                )}
              </View>
              <Ionicons name="add" size={20} color={colors.primary} />
            </Pressable>
          ))}

          {filteredExercises.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No exercises found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelBtnText}>CANCEL</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.background} />
          <Text style={styles.addBtnText}>ADD NEW</Text>
        </Pressable>
      </View>

      {/* Custom Exercise Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Exercise</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Exercise Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Incline DB Hammer Curls"
              placeholderTextColor={colors.textMuted}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddNew}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalSaveBtn,
                  !newExerciseName.trim() && styles.modalSaveBtnDisabled,
                  newExerciseName.trim() && pressed && { opacity: 0.85 },
                ]}
                onPress={handleAddNew}
                disabled={!newExerciseName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: colors.text,
  },
  headerPlaceholder: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 46,
    gap: spacing.xs,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseItemPressed: {
    backgroundColor: colors.backgroundElevated,
  },
  exerciseLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseName: {
    ...typography.titleSmall,
    color: colors.text,
  },
  customBadge: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  customBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 9,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addBtnText: {
    ...typography.titleSmall,
    color: colors.background,
    letterSpacing: 0.8,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    ...typography.titleSmall,
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalSaveBtnText: {
    ...typography.titleSmall,
    color: colors.background,
  },
});
