import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { authService } from "@/services/auth";
import { themeService, type Theme } from "@/services/theme";

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribeTheme = themeService.subscribe(setTheme);

    // TEMPORARILY DISABLED: Auth check that redirects
    // This was preventing manual navigation to auth screen during testing
    setIsLoading(false);

    /* Uncomment for production:
    // Check authentication status
    const checkAuth = () => {
      const user = authService.getCurrentUser();
      setIsAuthenticated(!!user);
      setIsLoading(false);

      if (user) {
        // User is authenticated, go to main app
        router.replace("/tabs");
      }
    };

    // Listen to auth state changes
    const unsubscribeAuth = authService.onAuthStateChanged((user) => {
      const authenticated = !!user;
      setIsAuthenticated(authenticated);
      setIsLoading(false);

      if (authenticated) {
        // User signed in, go to main app
        router.replace("/tabs");
      }
    });

    // Initial check
    checkAuth();
    */

    return () => {
      unsubscribeTheme();
    };
  }, [router]);

  const handleGetStarted = () => {
    router.replace("/tabs");
  };

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
