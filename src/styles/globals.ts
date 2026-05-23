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
  primary: '#ffffff',
  primaryDim: '#27272a',

  // Text
  text: '#f0f0ff',
  textSecondary: '#8888a8',
  textMuted: '#55556a',

  // Macros
  calorieColor: '#ffffff',   // white
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
  xs: 3,
  sm: 4,
  md: 6,
  lg: 6,
  xl: 8,
  full: 9999,
};

export const typography = {
  displayLarge: { fontFamily: 'Jura-Bold', fontSize: 32, letterSpacing: -0.5 },
  displayMedium: { fontFamily: 'Jura-Bold', fontSize: 24, letterSpacing: -0.3 },
  titleLarge: { fontFamily: 'Jura-Bold', fontSize: 20 },
  titleMedium: { fontFamily: 'Jura-Bold', fontSize: 17 },
  titleSmall: { fontFamily: 'Jura-Medium', fontSize: 15 },
  bodyLarge: { fontFamily: 'Jura-Regular', fontSize: 16 },
  bodyMedium: { fontFamily: 'Jura-Regular', fontSize: 14 },
  bodySmall: { fontFamily: 'Jura-Regular', fontSize: 12 },
  labelLarge: { fontFamily: 'Jura-Medium', fontSize: 13, letterSpacing: 0.3 },
  labelSmall: { fontFamily: 'Jura-Medium', fontSize: 11, letterSpacing: 0.5 },
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