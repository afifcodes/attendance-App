import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { authService } from "@/services/auth";
import { themeService, type Theme } from "@/services/theme";

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeTheme = themeService.subscribe(setTheme);
    const unsubscribeAuth = authService.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
      
      // Redirect based on authentication status
      if (user) {
        router.replace("/tabs");
      }
    });

    return () => {
      unsubscribeTheme();
      unsubscribeAuth();
    };
  }, [router]);

  const handleGetStarted = () => {
    router.push("/auth");
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to tabs
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        Track your Attendance everyday
      </Text>
      <TouchableOpacity
        style={[styles.getStartedButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleGetStarted}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
        AppsByAfif
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 30,
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 44,
  },
  getStartedButton: {
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    fontSize: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
