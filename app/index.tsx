import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View>
      <Text>Welcome to the Attendance App!</Text>
      <Button
        title="Go to Dashboard"
        onPress={() => router.push('/tabs')}
      />
    </View>
  );
}
