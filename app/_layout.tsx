import { Stack } from 'expo-router';
import { MealsProvider } from '@/src/context/MealsContext';
import { colors } from '@/src/styles/globals';

export default function RootLayout() {
  return (
    <MealsProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-meal"
          options={{
            headerShown: true,
            title: 'Log Food',
            headerStyle: { backgroundColor: colors.backgroundElevated },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600', fontSize: 17 },
            headerShadowVisible: false,
            presentation: 'card',
          }}
        />
      </Stack>
    </MealsProvider>
  );
}