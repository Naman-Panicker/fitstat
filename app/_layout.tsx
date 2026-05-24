import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { AuthProvider } from '@/src/context/AuthContext';
import { MealsProvider } from '@/src/context/MealsContext';
import { migrateDbIfNeeded } from '@/src/db/database';
import { colors } from '@/src/styles/globals';
import {
  useFonts,
  Jura_400Regular,
  Jura_500Medium,
  Jura_700Bold,
} from '@expo-google-fonts/jura';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Jura-Regular': Jura_400Regular,
    'Jura-Medium': Jura_500Medium,
    'Jura-Bold': Jura_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SQLiteProvider databaseName="fitstat.db" onInit={migrateDbIfNeeded}>
      <AuthProvider>
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
                headerTitleStyle: { fontFamily: 'Jura-Bold', fontSize: 17 },
                headerShadowVisible: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="profile"
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </Stack>
        </MealsProvider>
      </AuthProvider>
    </SQLiteProvider>
  );
}