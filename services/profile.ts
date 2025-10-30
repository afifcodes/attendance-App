import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Achievement, AttendanceStreak } from '@/types/User';

const STORAGE_KEYS = {
  USER_PROFILE: '@user_profile',
  ACHIEVEMENTS: '@user_achievements',
  STREAK: '@user_streak',
};

class ProfileService {
  private static instance: ProfileService;
  private profile: UserProfile | null = null;
  private listeners: ((profile: UserProfile | null) => void)[] = [];

  private constructor() {}

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  async initializeProfile(userId: string, email: string, displayName: string): Promise<UserProfile> {
    try {
      const existingProfile = await this.getProfile();
      if (existingProfile && existingProfile.uid === userId) {
        this.profile = existingProfile;
        this.notifyListeners();
        return existingProfile;
      }

      const newProfile: UserProfile = {
        uid: userId,
        email,
        displayName,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        streakCount: 0,
        longestStreak: 0,
        totalAttendanceDays: 0,
        achievements: [],
        preferences: {
          theme: 'auto',
          notifications: {
            enabled: true,
            dailyReminder: true,
            lowAttendanceAlert: true,
            weeklySummary: true,
            reminderTime: '18:00',
          },
          autoBackup: {
            enabled: false,
            time: '00:00',
          },
          privacy: {
            shareData: false,
            analytics: true,
          },
        },
        targetPercentage: 75,
      };

      await this.saveProfile(newProfile);
      this.profile = newProfile;
      this.notifyListeners();
      return newProfile;
    } catch (error) {
      console.error('Error initializing profile:', error);
      throw error;
    }
  }

  async getProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileData) {
        this.profile = JSON.parse(profileData);
        return this.profile;
      }
      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }

    try {
      const updatedProfile = { ...this.profile, ...updates };
      await this.saveProfile(updatedProfile);
      this.profile = updatedProfile;
      this.notifyListeners();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: Partial<UserProfile['preferences']>): Promise<UserProfile> {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }

    try {
      const updatedProfile = {
        ...this.profile,
        preferences: { ...this.profile.preferences, ...preferences },
      };
      await this.saveProfile(updatedProfile);
      this.profile = updatedProfile;
      this.notifyListeners();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  async updateStreak(attended: boolean): Promise<void> {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const streak = await this.getStreak();
      
      let newStreakCount = streak.currentStreak;
      let newLongestStreak = streak.longestStreak;

      if (attended) {
        // Check if this is consecutive attendance
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const yesterdayAttended = streak.streakHistory.find(
          h => h.date === yesterdayStr
        )?.attended;

        if (yesterdayAttended || streak.streakHistory.length === 0) {
          newStreakCount = streak.currentStreak + 1;
        } else {
          newStreakCount = 1; // Reset streak
        }

        if (newStreakCount > newLongestStreak) {
          newLongestStreak = newStreakCount;
        }

        // Add to total attendance days
        const updatedProfile = {
          ...this.profile,
          streakCount: newStreakCount,
          longestStreak: newLongestStreak,
          totalAttendanceDays: this.profile.totalAttendanceDays + 1,
        };

        await this.saveProfile(updatedProfile);
        this.profile = updatedProfile;
      } else {
        // Reset streak if absent
        if (streak.currentStreak > 0) {
          const updatedProfile = {
            ...this.profile,
            streakCount: 0,
          };
          await this.saveProfile(updatedProfile);
          this.profile = updatedProfile;
        }
      }

      // Update streak history
      await this.updateStreakHistory(today, attended);
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  async getStreak(): Promise<AttendanceStreak> {
    try {
      const streakData = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
      if (streakData) {
        return JSON.parse(streakData);
      }

      return {
        currentStreak: 0,
        longestStreak: 0,
        lastAttendanceDate: '',
        streakHistory: [],
      };
    } catch (error) {
      console.error('Error getting streak:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastAttendanceDate: '',
        streakHistory: [],
      };
    }
  }

  private async updateStreakHistory(date: string, attended: boolean): Promise<void> {
    try {
      const streak = await this.getStreak();
      const existingIndex = streak.streakHistory.findIndex(h => h.date === date);

      if (existingIndex >= 0) {
        streak.streakHistory[existingIndex].attended = attended;
      } else {
        streak.streakHistory.push({ date, attended });
      }

      // Keep only last 365 days
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

      streak.streakHistory = streak.streakHistory.filter(
        h => h.date >= oneYearAgoStr
      );

      await AsyncStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    } catch (error) {
      console.error('Error updating streak history:', error);
    }
  }

  async unlockAchievement(achievement: Achievement): Promise<void> {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }

    try {
      const existingAchievement = this.profile.achievements.find(a => a.id === achievement.id);
      if (existingAchievement) {
        return; // Achievement already unlocked
      }

      const updatedProfile = {
        ...this.profile,
        achievements: [...this.profile.achievements, achievement],
      };

      await this.saveProfile(updatedProfile);
      this.profile = updatedProfile;
      this.notifyListeners();
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      throw error;
    }
  }

  async checkAchievements(): Promise<Achievement[]> {
    if (!this.profile) {
      return [];
    }

    const newAchievements: Achievement[] = [];
    const existingIds = this.profile.achievements.map(a => a.id);

    // First attendance achievement
    if (this.profile.totalAttendanceDays >= 1 && !existingIds.includes('first_attendance')) {
      newAchievements.push({
        id: 'first_attendance',
        title: 'First Steps',
        description: 'Marked your first attendance',
        icon: '🎯',
        unlockedAt: new Date().toISOString(),
        category: 'milestone',
      });
    }

    // 7-day streak achievement
    if (this.profile.streakCount >= 7 && !existingIds.includes('week_streak')) {
      newAchievements.push({
        id: 'week_streak',
        title: 'Week Warrior',
        description: 'Maintained a 7-day attendance streak',
        icon: '🔥',
        unlockedAt: new Date().toISOString(),
        category: 'streak',
      });
    }

    // 30-day streak achievement
    if (this.profile.streakCount >= 30 && !existingIds.includes('month_streak')) {
      newAchievements.push({
        id: 'month_streak',
        title: 'Month Master',
        description: 'Maintained a 30-day attendance streak',
        icon: '👑',
        unlockedAt: new Date().toISOString(),
        category: 'streak',
      });
    }

    // 100 total days achievement
    if (this.profile.totalAttendanceDays >= 100 && !existingIds.includes('centurion')) {
      newAchievements.push({
        id: 'centurion',
        title: 'Centurion',
        description: 'Marked 100 total attendance days',
        icon: '💯',
        unlockedAt: new Date().toISOString(),
        category: 'milestone',
      });
    }

    // Unlock new achievements
    for (const achievement of newAchievements) {
      await this.unlockAchievement(achievement);
    }

    return newAchievements;
  }

  private async saveProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  subscribe(listener: (profile: UserProfile | null) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current profile
    listener(this.profile);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.profile));
  }

  async updateTargetPercentage(targetPercentage: number): Promise<UserProfile> {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }

    try {
      const updatedProfile = { ...this.profile, targetPercentage };
      await this.saveProfile(updatedProfile);
      this.profile = updatedProfile;
      this.notifyListeners();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating target percentage:', error);
      throw error;
    }
  }

  getCurrentProfile(): UserProfile | null {
    return this.profile;
  }
}

export const profileService = ProfileService.getInstance();
