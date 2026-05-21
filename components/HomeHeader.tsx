import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/styles/globals';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeHeader() {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{getGreeting()}</Text>
      <Text style={styles.date}>{currentDate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.displayMedium,
    color: colors.text,
  },
  date: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 4,
  },
});