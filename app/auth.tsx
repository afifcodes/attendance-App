import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { themeService, type Theme } from '@/services/theme';
import { authService } from '@/services/auth';
import { AnimationService } from '@/services/animations';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.9);

  useEffect(() => {
    const unsubscribe = themeService.subscribe(setTheme);

    // TEMPORARILY DISABLED: Auth check that redirects logged-in users
    // This was causing blank screen because authenticated users
    // were immediately redirected away from auth screen during testing

    /* Uncomment this code for production to prevent authenticated users from accessing login screen:
    // Check if user is already authenticated
    const checkAuth = () => {
      const user = authService.getCurrentUser();
      if (user) {
        // User is already authenticated, redirect to main app
        router.replace('/tabs');
        return;
      }
    };

    // Listen for auth state changes
    const unsubscribeAuth = authService.onAuthStateChanged((user) => {
      if (user) {
        // User signed in, redirect to main app
        router.replace('/tabs');
      }
    });

    checkAuth();
    */

    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      console.error('Validation failed: Missing fields');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      console.error('Validation failed: Missing display name');
      return;
    }

    setIsLoading(true);
    console.log('Starting email auth...');

    try {
      if (isLogin) {
        console.log('Signing in with email...');
        await authService.signInWithEmail(email.trim(), password);
      } else {
        console.log('Creating account with email...');
        await authService.createAccountWithEmail(email.trim(), password, displayName.trim());
      }

      console.log('Auth successful! Preparing to navigate...');

      // For port forwarding testing, add a small delay before navigation
      setTimeout(() => {
        console.log('Navigating to tabs...');
        router.replace('/tabs');
      }, 1000);

    } catch (error: any) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    console.log('Google auth button clicked!');
    setIsLoading(true);
    console.log('Set loading state to true');

    try {
      console.log('Calling authService.signInWithGoogle()...');
      await authService.signInWithGoogle();
      console.log('Google sign-in successful!');

      console.log('Navigating to tabs...');
      router.replace('/tabs');
    } catch (error: any) {
      console.error('Google auth error:', error);
      const message = error?.message || 'Failed to sign in with Google';
      Alert.alert('Google Sign-In', message);
    } finally {
      setIsLoading(false);
      console.log('Set loading state to false');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header with Gradient */}
          <LinearGradient
            colors={[theme.colors.pastel.purple, theme.colors.pastel.blue]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <Text style={styles.title}>📚</Text>
              <Text style={styles.appTitle}>Attendance Tracker</Text>
              <Text style={styles.appSubtitle}>
                {isLogin ? 'Welcome back!' : 'Let\'s get started'}
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.form}>
            {/* Google Auth */}
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: theme.colors.white, borderColor: theme.colors.border }]}
              onPress={handleGoogleAuth}
              disabled={false}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={[styles.googleButtonText, { color: theme.colors.text }]}>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* Email/Password Form */}
            {!isLogin && (
              <View style={styles.inputContainer}>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="Full Name"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.emailButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleEmailAuth}
              disabled={isLoading}
            >
              <Text style={styles.emailButtonText}>
                {isLoading ? 'Loading...' : (isLogin ? 'Sign In with Email' : 'Create Account')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setIsLogin(!isLogin);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            >
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Test Auth Buttons */}
          <View style={{ paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.emailButton, { backgroundColor: '#28A745', flex: 1 }]}
                onPress={async () => {
                  console.log('Test Sign Up clicked!');
                  setIsLoading(true);
                  try {
                    console.log('Creating test account...');
                    await authService.createAccountWithEmail('test@example.com', '123456', 'Test User');
                    console.log('Test account created! Navigating...');
                    router.replace('/tabs');
                  } catch (error: any) {
                    console.error('Test auth error:', error.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                <Text style={styles.emailButtonText}>
                  Test Sign Up
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.emailButton, { backgroundColor: '#007BFF', flex: 1 }]}
                onPress={async () => {
                  console.log('Test Sign In clicked!');
                  setIsLoading(true);
                  try {
                    console.log('Signing in with test account...');
                    await authService.signInWithEmail('test@example.com', '123456');
                    console.log('Test sign in successful! Navigating...');
                    router.replace('/tabs');
                  } catch (error: any) {
                    console.error('Test sign in error:', error.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                <Text style={styles.emailButtonText}>
                  Test Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerGradient: {
    borderRadius: 24,
    padding: 32,
    marginBottom: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  form: {
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 16,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
