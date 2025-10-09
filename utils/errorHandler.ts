import { Alert } from 'react-native';

export interface ErrorOptions {
  title?: string;
  message?: string;
  showAlert?: boolean;
}

export const handleError = (
  error: unknown,
  options: ErrorOptions = {}
) => {
  console.error('Error:', error);

  const {
    title = 'Error',
    message = 'An unexpected error occurred. Please try again.',
    showAlert = true
  } = options;

  let errorMessage = message;

  // Try to extract a more meaningful message from the error
  if (error instanceof Error) {
    errorMessage = error.message || message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    // Handle Firebase errors
    if ('code' in error) {
      const firebaseError = error as any;
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Invalid password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = firebaseError.message || message;
      }
    }
  }

  if (showAlert) {
    Alert.alert(title, errorMessage);
  }

  return errorMessage;
};

export const createAsyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  setLoading: (key: string, isLoading: boolean) => void,
  options: ErrorOptions & {
    loadingKey?: string;
    onSuccess?: (result: R) => void;
    onError?: (error: string) => void;
  } = {}
) => {
  return async (...args: T): Promise<R | null> => {
    const loadingKey = options.loadingKey || 'default';
    try {
      setLoading(loadingKey, true);
      const result = await fn(...args);
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = handleError(error, options);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setLoading(loadingKey, false);
    }
  };
};
