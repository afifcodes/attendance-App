import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppColors } from "../constants/colors"; // Updated import path


export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page Not Found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 20,
    backgroundColor: AppColors.gray[50],
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: AppColors.gray[900],
    marginBottom: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 24,
    backgroundColor: AppColors.primary,
    borderRadius: 12,
  },
  linkText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
