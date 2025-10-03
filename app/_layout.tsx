import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AttendanceProvider } from "@/contexts/AttendanceContext";
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Temporarily disable database initialization for web
        // await databaseService.init();
        
        // Subscribe to theme changes
        const unsubscribeTheme = themeService.subscribe(setTheme);
        
        // Check authentication status
        const unsubscribeAuth = authService.onAuthStateChanged(async (user) => {
          setIsAuthenticated(!!user);
          
          // Initialize profile and backup service if user is authenticated
          if (user) {
            try {
              await profileService.initializeProfile(
                user.uid,
                user.email || '',
                user.displayName || 'User'
              );
              
              // Schedule auto backup if enabled
              const profile = profileService.getCurrentProfile();
              if (profile?.preferences.autoBackup.enabled) {
                await backupService.scheduleAutoBackup(profile.preferences.autoBackup.time);
              }
            } catch (error) {
              console.error('Error initializing profile:', error);
            }
          }
          
          setIsLoading(false);
        });

        // Hide splash screen
        SplashScreen.hideAsync();

        return () => {
          unsubscribeTheme();
          unsubscribeAuth();
        };
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const content = (
    <QueryClientProvider client={queryClient}>
      <AttendanceProvider>
        <StatusBar style={themeService.isDarkMode() ? "light" : "dark"} />
        <RootLayoutNav />
      </AttendanceProvider>
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
