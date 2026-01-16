import { Colors } from '@/src/theme/colors';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [loaded] = useFonts({
  Inter: require('../assets/fonts/Inter_18pt-Regular.ttf'),
  InterMedium: require('../assets/fonts/Inter_18pt-Medium.ttf'),
  InterSemiBold: require('../assets/fonts/Inter_18pt-SemiBold.ttf'),
});


  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
