import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { authService } from "@/services/auth";
import { themeService, type Theme } from "@/services/theme";
import { profileService } from "@/services/profile";
import { backupService } from "@/services/backup";
// Temporarily disable database service for web
// import { databaseService } from "@/services/database";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, headerTitle: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribeTheme = themeService.subscribe(setTheme);

    // Hide splash screen
    SplashScreen.hideAsync();

    return () => {
      unsubscribeTheme();
    };
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LoadingProvider>
          <AttendanceProvider>
            <StatusBar style={themeService.isDarkMode() ? "light" : "dark"} />
            <RootLayoutNav />
          </AttendanceProvider>
        </LoadingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  // Only wrap with GestureHandlerRootView on native platforms
  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {content}
    </GestureHandlerRootView>
  );
}
