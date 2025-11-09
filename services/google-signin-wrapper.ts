import { Platform } from 'react-native';

// Define types for the exports
interface GoogleSigninType {
  configure: (options: { webClientId: string; offlineAccess: boolean; scopes?: string[] }) => void;
  hasPlayServices: (options?: { showPlayServicesUpdateDialog: boolean }) => Promise<boolean>;
  signIn: () => Promise<any>;
  signOut: () => Promise<void>;
  getTokens: () => Promise<{ accessToken: string; idToken: string }>;
  getCurrentUser: () => Promise<any>;
}

interface StatusCodesType {
  SIGN_IN_CANCELLED: string;
  IN_PROGRESS: string;
  PLAY_SERVICES_NOT_AVAILABLE: string;
}

let GoogleSignin: GoogleSigninType | undefined;
let statusCodes: StatusCodesType | undefined;

if (Platform.OS !== 'web') {
  try {
    // Use require to avoid static import failure in Expo Go
    const nativeModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = nativeModule.GoogleSignin;
    statusCodes = nativeModule.statusCodes;
  } catch (e) {
    console.warn('RNGoogleSignin module not found. Running in Expo Go or not linked. Google Sign-In will be disabled on native.');
    
    // Provide a mock implementation for Expo Go
    GoogleSignin = {
      configure: () => {},
      hasPlayServices: async () => true,
      signIn: async () => { throw new Error('Google Sign-In is not available in Expo Go. Use a custom development client.'); },
      signOut: async () => {},
      getTokens: async () => ({ accessToken: 'mock_token', idToken: 'mock_id_token' }),
      getCurrentUser: async () => null,
    } as GoogleSigninType;
    
    statusCodes = {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    } as StatusCodesType;
  }
}

export { GoogleSignin, statusCodes };