import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { backupService } from '@/services/backup';
import { useTheme } from '@/contexts/ThemeContext';
import { useLoading } from '@/contexts/LoadingContext';
import { handleError, createAsyncHandler } from '@/utils/errorHandler';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import type { UserProfile } from '@/types/User';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { setLoading } = useLoading();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCollege, setEditCollege] = useState('');

  useEffect(() => {
    const unsubscribe = profileService.subscribe(setUser);
    return unsubscribe;
  }, []);

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel editing
      setEditName(user?.displayName || '');
      setEditPhone(user?.phone || '');
      setEditCollege(user?.college || '');
    } else {
      // Start editing
      setEditName(user?.displayName || '');
      setEditPhone(user?.phone || '');
      setEditCollege(user?.college || '');
    }
    setIsEditing(!isEditing);
  }, [isEditing, user]);

  const handleSave = useCallback(async () => {
    if (!user) return;

    const handler = createAsyncHandler(
      () => profileService.updateProfile({
        displayName: editName.trim(),
        phone: editPhone.trim(),
        college: editCollege.trim(),
      }),
      setLoading,
      {
        loadingKey: 'profile_update',
        onSuccess: () => {
          setIsEditing(false);
          Alert.alert('Success', 'Profile updated successfully');
        }
      }
    );

    await handler();
  }, [user, editName, editPhone, editCollege, setLoading]);

  const handleSignOut = async () => {
    console.log('Sign out button pressed, starting sign out process...');
    try {
      await authService.signOut();
      console.log('Sign out successful, navigating to auth screen...');
      // Force navigation to auth screen after sign out
      setTimeout(() => {
        router.replace('/auth');
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      console.error('Failed to sign out. Please try again.');
    }
  };

  const handleBackupToDrive = async () => {
    try {
      // Check if signed in to Google Drive
      const isSignedIn = await backupService.isGoogleDriveSignedIn();
      if (!isSignedIn) {
        Alert.alert(
          'Google Sign-In Required',
          'You need to sign in with Google to backup to Drive. Would you like to sign in now?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: async () => {
                console.log('Attempting Google Sign-In...');
                const signInSuccess = await backupService.signInToGoogleDrive();
                console.log('Sign-in result:', signInSuccess);
                if (signInSuccess) {
                  console.log('Sign-in successful, retrying backup...');
                  // Now try backup again
                  handleBackupToDrive();
                } else {
                  Alert.alert('Error', 'Failed to sign in to Google Drive');
                }
              },
            },
          ],
        );
        return;
      }

      console.log('Starting backup to Google Drive...');
      // Perform backup
      const result = await backupService.backupToGoogleDrive();
      console.log('Backup result:', result);

      if (result.success) {
        Alert.alert('Success', 'Your data has been successfully backed up to Google Drive!');
      } else {
        Alert.alert('Backup Failed', result.error || 'Failed to backup data to Google Drive');
      }
    } catch (error) {
      console.error('Error backing up to Drive:', error);
      Alert.alert('Error', 'An unexpected error occurred during backup');
    }
  };

  const handleRestoreFromDrive = async () => {
    try {
      // Check if signed in to Google Drive
      const isSignedIn = await backupService.isGoogleDriveSignedIn();
      if (!isSignedIn) {
        Alert.alert(
          'Google Sign-In Required',
          'You need to sign in with Google to restore from Drive. Would you like to sign in now?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: async () => {
                const signInSuccess = await backupService.signInToGoogleDrive();
                if (signInSuccess) {
                  // Now try restore again
                  handleRestoreFromDrive();
                } else {
                  Alert.alert('Error', 'Failed to sign in to Google Drive');
                }
              },
            },
          ],
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Restore from Drive',
        'This will overwrite your current data with the latest backup from Google Drive. Are you sure?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Restore',
            onPress: async () => {
              console.log('Starting restore from Google Drive...');
              // Perform restore
              const result = await backupService.restoreFromGoogleDrive();
              console.log('Restore result:', result);

              if (result.success) {
                Alert.alert(
                  'Success',
                  'Your data has been successfully restored from Google Drive!',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Optionally reload the app or update UI
                      },
                    },
                  ],
                );
              } else {
                Alert.alert('Restore Failed', result.error || 'Failed to restore data from Google Drive');
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error restoring from Drive:', error);
      Alert.alert('Error', 'An unexpected error occurred during restore');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.colors.surface }]} onPress={handleEditToggle}>
              <Ionicons name={isEditing ? "close" : "pencil"} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={[styles.profileSection, {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.shadow
          }]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {(isEditing ? editName : user?.displayName || 'User').charAt(0)}
              </Text>
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, { color: theme.colors.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                selectTextOnFocus
              />
            ) : (
              <Text style={[styles.userName, { color: theme.colors.text }]}>{user?.displayName || 'User'}</Text>
            )}
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{user?.email || 'email@example.com'}</Text>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, { color: theme.colors.text }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter phone number"
                selectTextOnFocus
              />
            ) : (
              <Text style={[styles.userPhone, { color: theme.colors.textSecondary }]}>{user?.phone || 'Add phone number'}</Text>
            )}
            {isEditing ? (
              <TextInput
                style={[styles.editInput, { color: theme.colors.text }]}
                value={editCollege}
                onChangeText={setEditCollege}
                placeholder="Enter university name"
                selectTextOnFocus
              />
            ) : (
              <Text style={[styles.userCollege, { color: theme.colors.textSecondary }]}>{user?.college || 'Add university'}</Text>
            )}
            {isEditing && (
              <View style={styles.editButtons}>
                <TouchableOpacity style={[styles.editActionButton, { backgroundColor: theme.colors.success }]} onPress={handleSave}>
                  <Text style={styles.editActionText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editActionButton, { backgroundColor: theme.colors.danger }]} onPress={handleEditToggle}>
                  <Text style={styles.editActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow
            }]}>
              <Ionicons name="flame" size={24} color="#FF6B35" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{user?.streakCount || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Streak</Text>
            </View>
            <View style={[styles.statCard, {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow
            }]}>
            <Ionicons name="calendar-sharp" size={24} color="#4ECDC4" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{user?.totalAttendanceDays || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Days</Text>
            </View>
            <View style={[styles.statCard, {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.shadow
            }]}>
              <Ionicons name="trophy" size={24} color="#FFD93D" />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{user?.achievements?.length || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Achievements</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={toggleTheme}
            >
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={20} color={theme.colors.white} />
              <Text style={[styles.actionButtonText, { color: theme.colors.white }]}>
                Switch to {isDarkMode ? 'Light' : 'Dark'} Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleBackupToDrive}
            >
              <Ionicons name="cloud-upload" size={20} color={theme.colors.white} />
              <Text style={[styles.actionButtonText, { color: theme.colors.white }]}>Backup to Drive</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
              onPress={handleRestoreFromDrive}
            >
              <Ionicons name="cloud-download" size={20} color={theme.colors.white} />
              <Text style={[styles.actionButtonText, { color: theme.colors.white }]}>Restore from Drive</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1
            }]}>
              <Ionicons name="key" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Change Password</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={[styles.signOutButton, {
            borderColor: theme.colors.danger,
          }]} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color={theme.colors.danger} />
            <Text style={[styles.signOutText, { color: theme.colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <LoadingIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  editButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 6,
    textAlign: 'center',
  },
  userPhone: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  userCollege: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  editInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    minWidth: 200,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  editActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
