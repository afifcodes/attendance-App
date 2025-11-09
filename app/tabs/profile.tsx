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
import { /* backupService (removed) */ } from '@/services/backup';
import { migrateLocalToCloud, listAllAttendanceDays, startNewPeriod, getActivePeriodId, fetchAttendanceForActivePeriod } from '@/services/firestore';
import { useAttendance } from '@/contexts/AttendanceContext';
import useToast from '@/utils/useToast';
import { Modal, Button, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLoading } from '@/contexts/LoadingContext';
import { handleError, createAsyncHandler } from '@/utils/errorHandler';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import type { UserProfile } from '@/types/User';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { setLoading } = useLoading();
  const toast = useToast();
  const attendance = useAttendance();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCollege, setEditCollege] = useState('');

  useEffect(() => {
    const unsubscribe = profileService.subscribe(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // show active period if available
    (async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return;
        const pid = await getActivePeriodId(currentUser.uid);
        setActivePeriod(pid);
      } catch (err) {
        // ignore
      }
    })();
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
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in with Google to enable cloud backup.');
        return;
      }

      // Build localRecords shape expected by migrateLocalToCloud: { date: DayEntry[] }
      const recordsData = await AsyncStorage.getItem('@attendance_records');
      const subjectsData = await AsyncStorage.getItem('@attendance_subjects');
      if (!recordsData) {
        Alert.alert('No local data', 'No local attendance found to backup');
        return;
      }

      const recordsList = JSON.parse(recordsData) as Array<any>;
      const subjectsList = subjectsData ? JSON.parse(subjectsData) as Array<any> : [];

      const dateMap: Record<string, Record<string, { lectures: number; attended: number }>> = {};
      recordsList.forEach((r: any) => {
        const date = r.date;
        const sid = r.subjectId || r.subject || 'unknown';
        dateMap[date] = dateMap[date] || {};
        dateMap[date][sid] = dateMap[date][sid] || { lectures: 0, attended: 0 };
        if ((r.lectureIndex || 1) > dateMap[date][sid].lectures) dateMap[date][sid].lectures = r.lectureIndex || 1;
        if (r.status === 'present') dateMap[date][sid].attended += 1;
      });

      const localRecordsToMigrate: Record<string, Array<any>> = {};
      for (const [date, subjectsMap] of Object.entries(dateMap)) {
        localRecordsToMigrate[date] = Object.entries(subjectsMap).map(([subjectId, counts]) => ({
          subject: subjectsList.find((s: any) => s.id === subjectId)?.name || subjectId,
          subjectId,
          lectures: counts.lectures,
          attended: counts.attended,
        }));
      }

  await migrateLocalToCloud(currentUser.uid, localRecordsToMigrate);
  toast.show('Backup to Firestore completed', 'success');
      Alert.alert('Success', 'Your attendance was backed up to your Firebase account.');
    } catch (err) {
      console.error('Error backing up to Firestore:', err);
      Alert.alert('Backup failed', 'Failed to backup data to Firestore');
    }
  };

  const handleConfirmReset = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in to reset attendance');
        return;
      }
      setLoading('reset_period', true);
      setResetConfirmText('');
      setIsResetting(true);

      console.log('reset: backing up local attendance keys');
      // Backup local attendance keys
      const allKeys = await AsyncStorage.getAllKeys();
      const attendanceKeys = allKeys.filter(k => k.toLowerCase().includes('attendance'));
      const backup: Record<string, string | null> = {};
      for (const k of attendanceKeys) {
        backup[k] = await AsyncStorage.getItem(k);
      }

      let newPeriodId: string | null = null;
      try {
        console.log('reset: creating new period');
        newPeriodId = await startNewPeriod(currentUser.uid);
        console.log('reset: created period', newPeriodId);
      } catch (err) {
        console.error('reset: failed creating period', err);
        // restore nothing changed
        toast.show(`Reset failed: ${String(err)}`, 'error');
        setShowResetModal(false);
        return;
      }

      try {
        console.log('reset: clearing local attendance keys', attendanceKeys);
        if (attendanceKeys.length > 0) {
          await AsyncStorage.multiRemove(attendanceKeys);
        }
      } catch (err) {
        console.error('reset: failed clearing local keys, attempting restore', err);
        // try to restore backup
        const restorePairs = Object.entries(backup).filter(([k, v]) => v !== null);
        for (const [k, v] of restorePairs) {
          await AsyncStorage.setItem(k, v as string);
        }
        toast.show('Reset failed: could not clear local storage. Local data restored.', 'error');
        setIsResetting(false);
        setLoading('reset_period', false);
        return;
      }

      try {
        // Clear in-memory state and rehydrate from active period (should be empty/new)
        console.log('reset: clearing in-memory cache');
        await attendance.clearLocalCache();

        console.log('reset: fetching attendance for active period');
        const periodData = await fetchAttendanceForActivePeriod(currentUser.uid);
        // periodData: [{ id: date, meta, lectures: [...] }]
        for (const d of periodData) {
          const date = d.id;
          const lecturesRaw = d.lectures || [];
          // convert to aggregate per-subject entries
          const bySubject: Record<string, { lectures: number; attended: number; subject?: string }> = {};
          for (const e of lecturesRaw) {
            const sid = e.subjectId || e.subject || 'unknown';
            if (!bySubject[sid]) bySubject[sid] = { lectures: 0, attended: 0, subject: e.subject || sid };
            if (e.lectureIndex !== undefined) {
              bySubject[sid].lectures = Math.max(bySubject[sid].lectures, e.lectureIndex || 0);
              if (e.attended) bySubject[sid].attended += 1;
            } else {
              bySubject[sid].lectures = Math.max(bySubject[sid].lectures, e.lectures || 0);
              bySubject[sid].attended = (bySubject[sid].attended || 0) + (e.attended || 0);
            }
          }
          const lectureEntries = Object.entries(bySubject).map(([subjectId, v]) => ({ subjectId, lectures: v.lectures, attended: v.attended }));
          if (lectureEntries.length > 0) {
            await attendance.saveDayAttendance(date, lectureEntries);
          }
        }

        setActivePeriod(newPeriodId);
        toast.show(`Attendance reset successfully for ${newPeriodId}`, 'success');
        Alert.alert('Success', `Attendance reset for period ${newPeriodId}`);
        setShowResetModal(false);
      } catch (err) {
        console.error('reset: error during rehydrate', err);
        toast.show(`Reset failed: ${String(err)}`, 'error');
        // Attempt to restore backup if possible
        const restorePairs = Object.entries(backup).filter(([k, v]) => v !== null);
        for (const [k, v] of restorePairs) {
          await AsyncStorage.setItem(k, v as string);
        }
        setIsResetting(false);
        setLoading('reset_period', false);
        return;
      }

      setIsResetting(false);
      setLoading('reset_period', false);
    } catch (err) {
      console.error('Error resetting attendance period:', err);
      toast.show(`Reset failed: ${String(err)}`, 'error');
      Alert.alert('Error', 'Failed to reset attendance');
    } finally {
      setLoading('reset_period', false);
    }
  };

  const handleRestoreFromDrive = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in with Google to restore from cloud.');
        return;
      }

      Alert.alert(
        'Restore from Cloud',
        'This will attempt to restore attendance from your Firebase account. It will not overwrite local data unless you confirm. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: async () => {
              try {
                const docs = await listAllAttendanceDays(currentUser.uid);
                if (!docs || docs.length === 0) {
                  Alert.alert('No cloud backups', 'No attendance data found in your account');
                  return;
                }

                // Use AttendanceContext saveDayAttendance to write local copies
                for (const doc of docs) {
                  const date = doc.id;
                  // Prefer `lectures` (new shape). Fallback to legacy `entries`.
                  const lecturesRaw = Array.isArray(doc.lectures) ? doc.lectures : Array.isArray(doc.entries) ? doc.entries : [];
                  if (!Array.isArray(lecturesRaw) || lecturesRaw.length === 0) continue;

                  // Convert per-lecture docs or aggregates into aggregate LectureEntry[] expected by saveDayAttendance
                  const bySubject: Record<string, { lectures: number; attended: number; subject?: string }> = {};
                  for (const e of lecturesRaw) {
                    const sid = e.subjectId || e.subject || 'unknown';
                    if (!bySubject[sid]) bySubject[sid] = { lectures: 0, attended: 0, subject: e.subject || sid };
                    // If this is per-lecture shape
                    if (e.lectureIndex !== undefined) {
                      bySubject[sid].lectures = Math.max(bySubject[sid].lectures, e.lectureIndex || 0);
                      if (e.attended) bySubject[sid].attended += 1;
                    } else {
                      // legacy aggregate shape
                      bySubject[sid].lectures = Math.max(bySubject[sid].lectures, e.lectures || 0);
                      bySubject[sid].attended = (bySubject[sid].attended || 0) + (e.attended || 0);
                    }
                  }

                  const lectureEntries = Object.entries(bySubject).map(([subjectId, v]) => ({ subjectId, lectures: v.lectures, attended: v.attended }));
                  await attendance.saveDayAttendance(date, lectureEntries);
                }

                toast.show('Restored attendance from cloud', 'success');
                Alert.alert('Success', 'Attendance restored from cloud');
              } catch (err) {
                console.error('Error restoring from Firestore:', err);
                toast.show('Restore failed', 'error');
                Alert.alert('Restore failed', 'Failed to restore attendance from cloud');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error restoring from Firestore:', error);
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

          {/* Target Attendance Card removed per UX request */}

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

            {/* Backup/Restore buttons removed from Profile per UX request */}

            <TouchableOpacity style={[styles.secondaryButton, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1
            }]}>
              <Ionicons name="key" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.danger }]}
              onPress={() => setShowResetModal(true)}
            >
              <Ionicons name="trash" size={20} color={theme.colors.white} />
              <Text style={[styles.actionButtonText, { color: theme.colors.white }]}>Reset Attendance</Text>
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
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', backgroundColor: theme.colors.surface, padding: 20, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.colors.text }}>Confirm Reset Attendance</Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>Type YES RESET MY DATA to enable the confirm button.</Text>
            <TextInput
              value={resetConfirmText}
              onChangeText={setResetConfirmText}
              placeholder="Type YES RESET MY DATA"
              placeholderTextColor={theme.colors.textSecondary}
              style={{ borderWidth: 1, borderColor: theme.colors.border, padding: 12, borderRadius: 8, color: theme.colors.text, marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => { setShowResetModal(false); setResetConfirmText(''); }} style={{ padding: 10 }}>
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={resetConfirmText !== 'YES RESET MY DATA'}
                onPress={handleConfirmReset}
                style={{ padding: 10, backgroundColor: resetConfirmText === 'YES RESET MY DATA' ? theme.colors.danger : theme.colors.surface, borderRadius: 8 }}
              >
                <Text style={{ color: resetConfirmText === 'YES RESET MY DATA' ? theme.colors.white : theme.colors.textSecondary }}>Confirm Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  targetContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  targetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  targetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minWidth: 60,
    textAlign: 'center',
  },
  percentSymbol: {
    fontSize: 18,
    fontWeight: '600',
  },
});
