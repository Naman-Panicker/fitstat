import HomeHeader from '@/components/HomeHeader';
import { colors, globalStyles } from '@/src/styles/globals';
import { ScrollView, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Welcome to Fitstat</Text>

      <HomeHeader/>
    </ScrollView>
  );
}