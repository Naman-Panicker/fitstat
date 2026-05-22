import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { MealsProvider } from '@/src/context/MealsContext';
import { migrateDbIfNeeded } from '@/src/db/database';
import { colors } from '@/src/styles/globals';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="fitstat.db" onInit={migrateDbIfNeeded}>
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
    </SQLiteProvider>
  );
}