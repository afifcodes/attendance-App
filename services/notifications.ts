// Temporarily disabled for testing
// import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Mock notification configuration for testing
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

export interface AttendanceReminder {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
  enabled: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private permissionsGranted: boolean = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Mock implementation for testing
      console.log('Mock notification permissions request');
      this.permissionsGranted = true;
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async scheduleAttendanceReminder(reminder: AttendanceReminder): Promise<string | null> {
    if (!this.permissionsGranted) {
      console.log('Notification permissions not granted');
      return null;
    }

    try {
      // Mock implementation
      console.log('Mock scheduling notification:', reminder.title);
      return 'mock-notification-id';
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleMultipleAttendanceReminders(reminder: AttendanceReminder): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const day of reminder.days) {
      const id = await this.scheduleAttendanceReminder({
        ...reminder,
        days: [day],
      });
      
      if (id) {
        notificationIds.push(id);
      }
    }

    return notificationIds;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      // Mock implementation
      console.log('Mock canceling notification:', notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      // Mock implementation
      console.log('Mock canceling all notifications');
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<any[]> {
    try {
      // Mock implementation
      return [];
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Attendance-specific notification methods
  async scheduleLowAttendanceReminder(subjectName: string, percentage: number): Promise<void> {
    if (!this.permissionsGranted) return;

    const reminder: AttendanceReminder = {
      id: `low-attendance-${subjectName.toLowerCase().replace(/\s+/g, '-')}`,
      title: 'Low Attendance Alert',
      body: `${subjectName} attendance is at ${percentage.toFixed(1)}%. Consider attending more classes!`,
      hour: 9,
      minute: 0,
      days: [1, 2, 3, 4, 5], // Weekdays
      enabled: true,
    };

    await this.scheduleMultipleAttendanceReminders(reminder);
  }

  async scheduleDailyAttendanceReminder(): Promise<void> {
    if (!this.permissionsGranted) return;

    const reminder: AttendanceReminder = {
      id: 'daily-attendance',
      title: 'Daily Attendance Reminder',
      body: "Don't forget to mark your attendance for today's classes!",
      hour: 18,
      minute: 0,
      days: [1, 2, 3, 4, 5], // Weekdays
      enabled: true,
    };

    await this.scheduleMultipleAttendanceReminders(reminder);
  }

  async scheduleWeeklyAttendanceReminder(): Promise<void> {
    if (!this.permissionsGranted) return;

    const reminder: AttendanceReminder = {
      id: 'weekly-attendance',
      title: 'Weekly Attendance Summary',
      body: 'Check your weekly attendance summary and plan for the upcoming week!',
      hour: 19,
      minute: 0,
      days: [0], // Sunday
      enabled: true,
    };

    await this.scheduleAttendanceReminder(reminder);
  }

  // Check if notifications are enabled
  isEnabled(): boolean {
    return this.permissionsGranted;
  }

  // Get notification settings
  async getNotificationSettings(): Promise<{
    permissions: any;
    channels: any[];
  }> {
    try {
      // Mock implementation
      return {
        permissions: { status: 'granted', granted: true, canAskAgain: true, expires: 'never' },
        channels: [],
      };
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return {
        permissions: { status: 'undetermined', granted: false, canAskAgain: false, expires: 'never' },
        channels: [],
      };
    }
  }
}

export const notificationService = NotificationService.getInstance();
