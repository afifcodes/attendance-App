import React from 'react';
import { View, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useLoading } from '@/contexts/LoadingContext';
import { useTheme } from '@/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface LoadingIndicatorProps {
  loadingKey?: string;
  size?: 'small' | 'large';
  style?: any;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loadingKey,
  size = 'large',
  style,
}) => {
  const { isLoading, hasLoading } = useLoading();
  const { theme } = useTheme();

  const shouldShow = loadingKey ? isLoading(loadingKey) : hasLoading();

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.background + '80' }]} />
      <ActivityIndicator
        size={size}
        color={theme.colors.primary}
        style={styles.spinner}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  spinner: {
    zIndex: 1001,
  },
});
