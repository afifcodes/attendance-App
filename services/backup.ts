import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { profileService } from './profile';
import { authService } from './auth';

const BACKUP_KEYS = {
  LAST_BACKUP: '@last_backup_time',
  BACKUP_DATA: '@backup_data',
};

export interface BackupData {
  userId: string;
  timestamp: string;
  subjects: any[];
  records: any[];
  days: any[];
  profile: any;
  version: string;
}

class BackupService {
  private static instance: BackupService;
  private backupTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  async scheduleAutoBackup(time: string): Promise<void> {
    // Clear existing timer
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
    }

    try {
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      const backupTime = new Date();
      backupTime.setHours(hours, minutes, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (backupTime <= now) {
        backupTime.setDate(backupTime.getDate() + 1);
      }

      const timeUntilBackup = backupTime.getTime() - now.getTime();

      this.backupTimer = setTimeout(async () => {
        await this.performAutoBackup();
        // Schedule next backup for tomorrow at the same time
        this.scheduleAutoBackup(time);
      }, timeUntilBackup);

      console.log(`Auto backup scheduled for ${backupTime.toLocaleString()}`);
    } catch (error) {
      console.error('Error scheduling auto backup:', error);
    }
  }

  async cancelAutoBackup(): Promise<void> {
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
      this.backupTimer = null;
    }
  }

  async performAutoBackup(): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.log('No user logged in, skipping backup');
        return false;
      }

      // Get all data to backup
      const subjects = await AsyncStorage.getItem('@attendance_subjects');
      const records = await AsyncStorage.getItem('@attendance_records');
      const days = await AsyncStorage.getItem('@attendance_days');
      const profile = await AsyncStorage.getItem('@user_profile');

      const backupData: BackupData = {
        userId: currentUser.uid,
        timestamp: new Date().toISOString(),
        subjects: subjects ? JSON.parse(subjects) : [],
        records: records ? JSON.parse(records) : [],
        days: days ? JSON.parse(days) : [],
        profile: profile ? JSON.parse(profile) : null,
        version: '1.0.0',
      };

      // Save backup data locally
      await AsyncStorage.setItem(BACKUP_KEYS.BACKUP_DATA, JSON.stringify(backupData));
      await AsyncStorage.setItem(BACKUP_KEYS.LAST_BACKUP, new Date().toISOString());

      // Send notification about successful backup
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Auto Backup Completed',
          body: 'Your attendance data has been automatically backed up.',
          sound: true,
        },
        trigger: null,
      });

      console.log('Auto backup completed successfully');
      return true;
    } catch (error) {
      console.error('Error performing auto backup:', error);
      
      // Send notification about failed backup
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Auto Backup Failed',
          body: 'There was an error backing up your data. Please check your settings.',
          sound: true,
        },
        trigger: null,
      });

      return false;
    }
  }

  async getLastBackupTime(): Promise<Date | null> {
    try {
      const lastBackup = await AsyncStorage.getItem(BACKUP_KEYS.LAST_BACKUP);
      return lastBackup ? new Date(lastBackup) : null;
    } catch (error) {
      console.error('Error getting last backup time:', error);
      return null;
    }
  }

  async getBackupData(): Promise<BackupData | null> {
    try {
      const backupData = await AsyncStorage.getItem(BACKUP_KEYS.BACKUP_DATA);
      return backupData ? JSON.parse(backupData) : null;
    } catch (error) {
      console.error('Error getting backup data:', error);
      return null;
    }
  }

  async restoreFromBackup(): Promise<boolean> {
    try {
      const backupData = await this.getBackupData();
      if (!backupData) {
        throw new Error('No backup data found');
      }

      // Restore data to AsyncStorage
      if (backupData.subjects) {
        await AsyncStorage.setItem('@attendance_subjects', JSON.stringify(backupData.subjects));
      }
      if (backupData.records) {
        await AsyncStorage.setItem('@attendance_records', JSON.stringify(backupData.records));
      }
      if (backupData.days) {
        await AsyncStorage.setItem('@attendance_days', JSON.stringify(backupData.days));
      }
      if (backupData.profile) {
        await AsyncStorage.setItem('@user_profile', JSON.stringify(backupData.profile));
      }

      console.log('Data restored from backup successfully');
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  async exportBackupData(): Promise<string> {
    try {
      const backupData = await this.getBackupData();
      if (!backupData) {
        throw new Error('No backup data found');
      }

      // Convert to JSON string for export
      const exportData = {
        ...backupData,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting backup data:', error);
      throw error;
    }
  }

  async importBackupData(jsonData: string): Promise<boolean> {
    try {
      const backupData = JSON.parse(jsonData);
      
      // Validate backup data structure
      if (!backupData.userId || !backupData.timestamp) {
        throw new Error('Invalid backup data format');
      }

      // Save imported backup data
      await AsyncStorage.setItem(BACKUP_KEYS.BACKUP_DATA, JSON.stringify(backupData));
      await AsyncStorage.setItem(BACKUP_KEYS.LAST_BACKUP, new Date().toISOString());

      console.log('Backup data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing backup data:', error);
      return false;
    }
  }

  async clearBackupData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BACKUP_KEYS.BACKUP_DATA);
      await AsyncStorage.removeItem(BACKUP_KEYS.LAST_BACKUP);
      console.log('Backup data cleared');
    } catch (error) {
      console.error('Error clearing backup data:', error);
    }
  }

  // Manual backup methods for user-initiated backups
  async createManualBackup(): Promise<BackupData | null> {
    try {
      const success = await this.performAutoBackup();
      return success ? await this.getBackupData() : null;
    } catch (error) {
      console.error('Error creating manual backup:', error);
      return null;
    }
  }

  async getBackupInfo(): Promise<{
    lastBackup: Date | null;
    backupSize: number;
    dataCount: {
      subjects: number;
      records: number;
      days: number;
    };
  }> {
    try {
      const lastBackup = await this.getLastBackupTime();
      const backupData = await this.getBackupData();
      
      const dataCount = {
        subjects: backupData?.subjects?.length || 0,
        records: backupData?.records?.length || 0,
        days: backupData?.days?.length || 0,
      };

      const backupSize = backupData ? JSON.stringify(backupData).length : 0;

      return {
        lastBackup,
        backupSize,
        dataCount,
      };
    } catch (error) {
      console.error('Error getting backup info:', error);
      return {
        lastBackup: null,
        backupSize: 0,
        dataCount: { subjects: 0, records: 0, days: 0 },
      };
    }
  }
}

export const backupService = BackupService.getInstance();
