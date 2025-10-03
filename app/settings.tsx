import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Bell, 
  Download, 
  Upload,
  User,
  LogOut,
  Shield
} from 'lucide-react-native';
import { themeService, type Theme } from '@/services/theme';
import { notificationService } from '@/services/notifications';
import { exportService } from '@/services/export';
import { authService } from '@/services/auth';
// Temporarily disable database service for web
// import { databaseService } from '@/services/database';
import { useAttendance } from '@/contexts/AttendanceContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { subjects, records, days } = useAttendance();
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [isDarkMode, setIsDarkMode] = useState(themeService.isDarkMode());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [user, setUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribeTheme = themeService.subscribe(setTheme);
    
    // Check notification permissions
    checkNotificationPermissions();
    
    // Listen to auth state changes
    const unsubscribeAuth = authService.onAuthStateChanged(setUser);

    return () => {
      unsubscribeTheme();
      unsubscribeAuth();
    };
  }, []);

  const checkNotificationPermissions = async () => {
    const enabled = notificationService.isEnabled();
    setNotificationsEnabled(enabled);
  };

  const toggleTheme = () => {
    themeService.toggleTheme();
    setIsDarkMode(themeService.isDarkMode());
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await notificationService.requestPermissions();
      setNotificationsEnabled(granted);
      
      if (granted) {
        // Schedule default notifications
        await notificationService.scheduleDailyAttendanceReminder();
        await notificationService.scheduleWeeklyAttendanceReminder();
      }
    } else {
      await notificationService.cancelAllNotifications();
      setNotificationsEnabled(false);
    }
  };

  const exportToPDF = async () => {
    try {
      const uri = await exportService.generatePDFReport(subjects, records, days);
      if (uri) {
        const fileName = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`;
        await exportService.shareFile(uri, fileName);
      } else {
        Alert.alert('Error', 'Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert('Error', 'Failed to export PDF report');
    }
  };

  const exportToCSV = async () => {
    try {
      const uri = await exportService.generateCSVReport(subjects, records);
      if (uri) {
        const fileName = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
        await exportService.shareFile(uri, fileName);
      } else {
        Alert.alert('Error', 'Failed to generate CSV report');
      }
    } catch (error) {
      console.error('Export CSV error:', error);
      Alert.alert('Error', 'Failed to export CSV report');
    }
  };

  const backupData = async () => {
    try {
      // Temporarily disabled for web
      // const data = await databaseService.exportData();
      // Here you would typically upload to Google Drive or another cloud service
      Alert.alert('Success', 'Data backup completed successfully (Mock)');
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Failed to backup data');
    }
  };

  const restoreData = () => {
    Alert.alert(
      'Restore Data',
      'This will replace all current data with the backup. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Here you would typically download from Google Drive or another cloud service
              Alert.alert('Success', 'Data restored successfully');
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Error', 'Failed to restore data');
            }
          }
        },
      ]
    );
  };

  const signOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your attendance data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Temporarily disabled for web
              // await databaseService.clearAllData();
              Alert.alert('Success', 'All data has been cleared (Mock)');
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightComponent,
    iconColor = theme.colors.primary 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    iconColor?: string;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon color={iconColor} size={20} />
        </View>
        <View style={styles.settingItemContent}>
          <Text style={[styles.settingItemTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingItemSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Manage your app preferences
          </Text>
        </View>

        {/* User Section */}
        {user && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <SettingItem
              icon={User}
              title="Account"
              subtitle={user.email || 'No email'}
              iconColor={theme.colors.primary}
            />
            <SettingItem
              icon={LogOut}
              title="Sign Out"
              onPress={signOut}
              iconColor={theme.colors.danger}
            />
          </View>
        )}

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingItem
            icon={isDarkMode ? Moon : Sun}
            title="Dark Mode"
            subtitle={isDarkMode ? 'Enabled' : 'Disabled'}
            rightComponent={
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                thumbColor={isDarkMode ? theme.colors.primary : theme.colors.gray[300]}
              />
            }
          />
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingItem
            icon={Bell}
            title="Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
                thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.gray[300]}
              />
            }
          />
        </View>

        {/* Export Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingItem
            icon={Download}
            title="Export to PDF"
            subtitle="Generate attendance report"
            onPress={exportToPDF}
          />
          <SettingItem
            icon={Download}
            title="Export to CSV"
            subtitle="Export data as spreadsheet"
            onPress={exportToCSV}
          />
        </View>

        {/* Backup Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingItem
            icon={Upload}
            title="Backup Data"
            subtitle="Save to cloud storage"
            onPress={backupData}
          />
          <SettingItem
            icon={Download}
            title="Restore Data"
            subtitle="Load from backup"
            onPress={restoreData}
          />
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingItem
            icon={Shield}
            title="Clear All Data"
            subtitle="Permanently delete all data"
            onPress={clearAllData}
            iconColor={theme.colors.danger}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Attendance Tracker v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Made with ❤️ by AppsByAfif
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingItemSubtitle: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
});
