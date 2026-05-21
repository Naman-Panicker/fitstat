import { StyleSheet } from 'react-native';

export const colors = {
  // Base (AMOLED Black Optimized)
  background: '#000000',
  backgroundElevated: '#09090b',
  surface: '#111115',
  surfaceHover: '#181820',
  border: '#1f1f27',
  borderSubtle: '#141418',

  // Brand
  primary: '#4fc3f7',
  primaryDim: '#143a54',

  // Text
  text: '#f0f0ff',
  textSecondary: '#8888a8',
  textMuted: '#55556a',

  // Macros
  calorieColor: '#4fc3f7',   // blue
  proteinColor: '#4ade80',   // green
  carbColor: '#fbbf24',      // amber
  fatColor: '#f87171',       // red/coral
  fiberColor: '#a78bfa',     // violet/purple

  // Feedback
  alert: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  displayLarge: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayMedium: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  titleLarge: { fontSize: 20, fontWeight: '600' as const },
  titleMedium: { fontSize: 17, fontWeight: '600' as const },
  titleSmall: { fontSize: 15, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const },
  bodySmall: { fontSize: 12, fontWeight: '400' as const },
  labelLarge: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  labelSmall: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5 },
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.displayMedium,
    color: colors.text,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});