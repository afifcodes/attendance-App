// Temporarily disabled Firebase imports for testing
// import { 
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signInWithPopup,
//   signOut,
//   onAuthStateChanged,
//   User,
//   updateProfile
// } from 'firebase/auth';
// import { auth, googleProvider } from './firebase';

// Mock Firebase types for now
type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private authListeners: ((user: AuthUser | null) => void)[] = [];

  // Sign in with email and password (Mock implementation)
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      // Mock implementation - in real app, this would use Firebase
      const mockUser: User = {
        uid: 'mock-uid-' + Date.now(),
        email: email,
        displayName: email.split('@')[0],
        photoURL: null,
      };
      const authUser = this.mapFirebaseUser(mockUser);
      this.currentUser = authUser;
      this.notifyAuthListeners();
      return authUser;
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  }

  // Create account with email and password (Mock implementation)
  async createAccountWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      // Mock implementation - in real app, this would use Firebase
      const mockUser: User = {
        uid: 'mock-uid-' + Date.now(),
        email: email,
        displayName: displayName || email.split('@')[0],
        photoURL: null,
      };
      const authUser = this.mapFirebaseUser(mockUser);
      this.currentUser = authUser;
      this.notifyAuthListeners();
      return authUser;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  // Sign in with Google (Mock implementation)
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      // Mock implementation - in real app, this would use Firebase
      const mockUser: User = {
        uid: 'mock-google-uid-' + Date.now(),
        email: 'user@gmail.com',
        displayName: 'Google User',
        photoURL: null,
      };
      const authUser = this.mapFirebaseUser(mockUser);
      this.currentUser = authUser;
      this.notifyAuthListeners();
      return authUser;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  // Sign out (Mock implementation)
  async signOut(): Promise<void> {
    try {
      // Mock implementation - in real app, this would use Firebase
      console.log('Mock sign out');
      this.currentUser = null;
      this.notifyAuthListeners();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user (Mock implementation)
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  // Listen to auth state changes (Mock implementation)
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.authListeners.push(callback);
    
    // Immediately call with current user
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(callback);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  // Notify all auth listeners
  private notifyAuthListeners(): void {
    this.authListeners.forEach(listener => listener(this.currentUser));
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
    return !!auth.currentUser;
  }

  // Get user ID
  getUserId(): string | null {
    return auth.currentUser?.uid || null;
  }
}

export const authService = new AuthService();
