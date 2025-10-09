export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  college?: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
  streakCount: number;
  longestStreak: number;
  totalAttendanceDays: number;
  achievements: Achievement[];
  preferences: UserPreferences;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: 'attendance' | 'streak' | 'milestone' | 'special';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    lowAttendanceAlert: boolean;
    weeklySummary: boolean;
    reminderTime: string; // HH:MM format
  };
  autoBackup: {
    enabled: boolean;
    time: string; // HH:MM format
  };
  privacy: {
    shareData: boolean;
    analytics: boolean;
  };
}

export interface AttendanceStreak {
  currentStreak: number;
  longestStreak: number;
  lastAttendanceDate: string;
  streakHistory: {
    date: string;
    attended: boolean;
  }[];
}
