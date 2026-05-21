import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '@/src/context/MealsContext';
import { FoodItem, MealType } from '@/src/types';
import { colors, radius, spacing, typography } from '@/src/styles/globals';

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snacks', value: 'snacks' },
];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AddMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType }>();
  const { foodLibrary, addFoodToLibrary, logMeal } = useMeals();

  // ── Selected meal type ─────────────────────────────────────────────────────
  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    params.mealType ?? 'breakfast'
  );

  // ── Search / food library ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foodLibrary.slice(0, 8);
    return foodLibrary.filter((f) => f.name.toLowerCase().includes(q));
  }, [search, foodLibrary]);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [servings, setServings] = useState('1');

  const prefillFromFood = (food: FoodItem) => {
    setSelectedFood(food);
    setName(food.name);
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFat(String(food.fat));
    setFiber(String(food.fiber || 0));
    setSearch('');
  };

  const clearForm = () => {
    setSelectedFood(null);
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('');
    setServings('1');
    setSearch('');
  };

  const canSubmit =
    name.trim() !== '' &&
    calories !== '' &&
    protein !== '' &&
    carbs !== '' &&
    fat !== '' &&
    fiber !== '';

  const handleLog = () => {
    if (!canSubmit) return;

    const food: FoodItem = selectedFood ?? {
      id: uid(),
      name: name.trim(),
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
      fiber: Number(fiber),
    };

    // Save to library if it's a new food
    if (!selectedFood) {
      addFoodToLibrary(food);
    }

    logMeal({
      id: uid(),
      food,
      mealType: selectedMealType,
      servings: Math.max(Number(servings) || 1, 0.1),
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Type Selector */}
          <Text style={styles.sectionLabel}>Meal</Text>
          <View style={styles.pillRow}>
            {MEAL_TYPES.map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.mealPill,
                  selectedMealType === value && styles.mealPillActive,
                ]}
                onPress={() => setSelectedMealType(value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.mealPillText,
                    selectedMealType === value && styles.mealPillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Food Search / Library */}
          <Text style={styles.sectionLabel}>Search Saved Foods</Text>
          <View style={styles.searchRow}>
            <Ionicons
              name="search"
              size={16}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search food..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {filteredLibrary.length > 0 && (
            <View style={styles.libraryList}>
              {filteredLibrary.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={[
                    styles.libraryItem,
                    selectedFood?.id === food.id && styles.libraryItemSelected,
                  ]}
                  onPress={() => prefillFromFood(food)}
                  activeOpacity={0.7}
                >
                  <View style={styles.libraryItemLeft}>
                    <Text style={styles.libraryItemName}>{food.name}</Text>
                    <Text style={styles.libraryItemMacros}>
                      P {food.protein}g · C {food.carbs}g · F {food.fat}g · Fi {food.fiber || 0}g
                    </Text>
                  </View>
                  <Text style={styles.libraryItemCal}>{food.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          {selectedFood && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearForm}>
              <Ionicons name="close" size={14} color={colors.textSecondary} />
              <Text style={styles.clearBtnText}>Clear selection</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>Food Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Grilled Chicken Breast"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          <View style={styles.macroGrid}>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Calories</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.macroUnit}>kcal</Text>
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Protein</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Fat</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
            <View style={styles.macroField}>
              <Text style={styles.macroLabel}>Fiber</Text>
              <TextInput
                style={styles.macroInput}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={fiber}
                onChangeText={setFiber}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Servings</Text>
          <TextInput
            style={[styles.input, styles.servingsInput]}
            placeholder="1"
            placeholderTextColor={colors.textMuted}
            value={servings}
            onChangeText={setServings}
            keyboardType="numeric"
            returnKeyType="done"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleLog}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            <Ionicons name="checkmark" size={18} color={canSubmit ? colors.background : colors.textMuted} />
            <Text style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}>
              Log Meal
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...typography.labelLarge,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  mealPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mealPillActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  mealPillText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  mealPillTextActive: {
    color: colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 44,
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
  libraryList: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  libraryItemSelected: {
    backgroundColor: colors.primaryDim,
  },
  libraryItemLeft: {
    flex: 1,
    gap: 2,
  },
  libraryItemName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  libraryItemMacros: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  libraryItemCal: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.labelSmall,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  clearBtnText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.bodyMedium,
    color: colors.text,
  },
  servingsInput: {
    width: 100,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  macroField: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  macroLabel: {
    ...typography.labelSmall,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  macroInput: {
    ...typography.titleMedium,
    color: colors.text,
    paddingVertical: 0,
  },
  macroUnit: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  submitBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitText: {
    ...typography.titleSmall,
    color: colors.background,
  },
  submitTextDisabled: {
    color: colors.textMuted,
  },
});
