import { Appearance } from 'react-native';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    shadow: string;
    white: string;
    black: string;
    pastel: {
      pink: string;
      purple: string;
      blue: string;
      green: string;
      yellow: string;
      orange: string;
      red: string;
      indigo: string;
    };
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#8B5CF6', // Purple pastel
    secondary: '#A78BFA', // Light purple
    success: '#34D399', // Mint green
    warning: '#FBBF24', // Amber
    danger: '#F87171', // Rose
    background: '#FAFAFA', // Clean white
    surface: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
    // Pastel color palette
    pastel: {
      pink: '#FCE7F3',
      purple: '#F3E8FF',
      blue: '#DBEAFE',
      green: '#D1FAE5',
      yellow: '#FEF3C7',
      orange: '#FED7AA',
      red: '#FEE2E2',
      indigo: '#E0E7FF',
    },
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

const darkTheme: Theme = {
  colors: {
    primary: '#A78BFA', // Lighter purple for dark mode
    secondary: '#C4B5FD', // Light purple
    success: '#6EE7B7', // Brighter mint
    warning: '#FCD34D', // Brighter amber
    danger: '#FCA5A5', // Brighter rose
    background: '#0F172A', // Deep dark blue
    surface: '#1E293B', // Slate
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
    // Pastel colors for dark mode (darker variants)
    pastel: {
      pink: '#831843',
      purple: '#6B21A8',
      blue: '#1E40AF',
      green: '#065F46',
      yellow: '#92400E',
      orange: '#C2410C',
      red: '#991B1B',
      indigo: '#3730A3',
    },
    gray: {
      50: '#0F172A',
      100: '#1E293B',
      200: '#334155',
      300: '#475569',
      400: '#64748B',
      500: '#94A3B8',
      600: '#CBD5E1',
      700: '#E2E8F0',
      800: '#F1F5F9',
      900: '#F8FAFC',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export class ThemeService {
  private static instance: ThemeService;
  private currentTheme: Theme;
  private listeners: ((theme: Theme) => void)[] = [];

  private constructor() {
    // Initialize with system preference
    this.currentTheme = this.getSystemTheme();
    
    // Listen to system theme changes
    Appearance.addChangeListener(({ colorScheme }) => {
      this.currentTheme = colorScheme === 'dark' ? darkTheme : lightTheme;
      this.notifyListeners();
    });
  }

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private getSystemTheme(): Theme {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? darkTheme : lightTheme;
  }

  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  setTheme(isDark: boolean): void {
    this.currentTheme = isDark ? darkTheme : lightTheme;
    this.notifyListeners();
  }

  toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  isDarkMode(): boolean {
    return this.currentTheme === darkTheme;
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }
}

export const themeService = ThemeService.getInstance();
