// Extra text removed - fixing syntax error
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider,
  User,
  updateProfile
} from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

class AuthService {
  constructor() {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '744937657357-vgj5p2upoj7n3huvqa7ftmgda2ujtvuk.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const activeAuth = this.getAuthOrThrow();
      const userCredential = await signInWithEmailAndPassword(activeAuth, email, password);
      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Create account with email and password
  async createAccountWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const activeAuth = this.getAuthOrThrow();
      const userCredential = await createUserWithEmailAndPassword(activeAuth, email, password);
      
      // Update display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('Error creating account:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      // Ensure Google Play Services are available (and prompt to update if needed)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const signInResult = await GoogleSignin.signIn();
      const idToken = (signInResult as any)?.idToken;

      if (!idToken) {
        throw new Error('Missing Google ID token');
      }

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase with the credential
  const activeAuth = this.getAuthOrThrow();
  const userCredential = await signInWithCredential(activeAuth, googleCredential);

      return this.mapFirebaseUser(userCredential.user);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);

      // Handle specific Google Sign-In errors
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google Sign-In was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google Sign-In is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services are not available');
      } else {
        // Firebase or general error
        const message = error.message || 'Failed to sign in with Google';
        throw new Error(message);
      }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      console.log('Starting sign out process...');
      await firebaseSignOut(this.getAuthOrThrow());
      console.log('Firebase sign out completed, clearing Google Sign-In...');
      // Also sign out from Google Sign-In if using Google auth
      try {
        await GoogleSignin.signOut();
      } catch (googleError) {
        console.log('Google Sign-In sign out error (may not be signed in):', googleError);
      }
      console.log('Sign out process completed successfully');
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    const user = this.getAuthOrThrow().currentUser;
    return user ? this.mapFirebaseUser(user) : null;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    return firebaseOnAuthStateChanged(this.getAuthOrThrow(), (user) => {
      callback(user ? this.mapFirebaseUser(user) : null);
    });
  }

  // Map Firebase User to our AuthUser interface
  private mapFirebaseUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthOrThrow().currentUser;
  }

  // Get user ID
  getUserId(): string | null {
    return this.getAuthOrThrow().currentUser?.uid || null;
  }

  // Helper to ensure auth is available at runtime
  private getAuthOrThrow() {
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }
    return auth;
  }
}

export const authService = new AuthService();
