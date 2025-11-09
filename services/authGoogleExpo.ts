import { authService } from './auth';

/**
 * Quick helper to sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export function firebaseSignOut() {
  return authService.signOut();
}

/**
 * Quick helper to observe authentication state changes
 * @param callback Function called whenever auth state changes
 * @returns Unsubscribe function to stop listening
 */
export function observeAuth(callback: (user: any) => void) {
  return authService.onAuthStateChanged(callback);
}

/**
 * Quick helper to get the current authenticated user
 * @returns Current user or null if not authenticated
 */
export function getCurrentUser() {
  return authService.getCurrentUser();
}

/**
 * Quick helper to check if user is authenticated
 * @returns true if user is authenticated, false otherwise
 */
export function isAuthenticated() {
  return authService.isAuthenticated();
}
