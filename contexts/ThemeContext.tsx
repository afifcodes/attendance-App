import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themeService } from '../services/theme';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(themeService.getCurrentTheme());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(themeService.isDarkMode());

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((newTheme: Theme) => {
      setThemeState(newTheme);
      setIsDarkMode(themeService.isDarkMode());
    });

    return unsubscribe;
  }, []);

  const toggleTheme = () => {
    themeService.toggleTheme();
  };

  const setTheme = (isDark: boolean) => {
    themeService.setTheme(isDark);
  };

  const value: ThemeContextType = {
    theme,
    isDarkMode,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
