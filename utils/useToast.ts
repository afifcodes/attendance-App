// Placeholder for a custom toast/snackbar hook.
// In a real Expo/React Native app, this would likely use a library like react-native-toast-message.

interface ToastOptions {
  type: 'success' | 'error' | 'info';
  duration?: number;
}

const useToast = () => {
  const show = (message: string, type: ToastOptions['type'] = 'info', duration: number = 3000) => {
    console.log(`[TOAST - ${type.toUpperCase()}]: ${message}`);
    // In a real implementation, this would call a toast library function
    // e.g., Toast.show({ type, text1: message, visibilityTime: duration });
  };

  return { show };
};

export default useToast;