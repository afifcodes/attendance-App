import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { themeService, type Theme } from '@/services/theme';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format as formatDateFn, parseISO } from 'date-fns';

export default function PastAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const router = useRouter();
  const { date } = useLocalSearchParams(); // Get the date parameter from navigation
  const [profile, setProfile] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(date as string || formatDateFn(new Date(), 'yyyy-MM-dd'));
  const [subjectMarkDate, setSubjectMarkDate] = useState(formatDateFn(new Date(), 'yyyy-MM-dd'));
  const [pendingLectures, setPendingLectures] = useState<{ [key: number]: 'present' | 'absent' | 'no-lecture' }>({});
  const [notes, setNotes] = useState('');
  const [userName, setUserName] = useState<string>('Student');
  const [showSubjectMarkModal, setShowSubjectMarkModal] = useState(false);

  const { subjects, records, getOverallStats, markAttendance, deleteLecture, markAllAttendance } = useAttendance();

  // Safe delete helper: use context deleteLecture if available,
  // otherwise fall back to marking the lecture as 'no-lecture' so it's ignored in calculations.
  const safeDeleteAttendanceRecord = useCallback((subjectId: string, date: string, lectureIndex: number) => {
    if (typeof deleteLecture === 'function') {
      try {
        deleteLecture(subjectId, date, lectureIndex);
        return;
      } catch (err) {
        console.warn('deleteLecture threw an error, falling back to mark as no-lecture:', err);
      }
    }

    try {
      // fallback behavior: mark as no-lecture so it's excluded from totals
      markAttendance(subjectId, date, 'no-lecture', lectureIndex);
    } catch (err) {
      console.warn('Fallback markAttendance(no-lecture) failed:', err);
    }
  }, [deleteLecture, markAttendance]);

  // Recreate deleteDayAttendance using the safe helper
  const deleteDayAttendance = useCallback((date: string) => {
    const dayRecords = records.filter(r => r.date === date && r.status !== 'no-lecture');
    if (dayRecords.length > 0) {
      Alert.alert(
        'Delete All Attendance',
        `Are you sure you want to delete all attendance records for ${new Date(date).toDateString()}? This will remove ${dayRecords.length} lecture(s) and cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: () => {
              dayRecords.forEach(record => {
                safeDeleteAttendanceRecord(record.subjectId, date, record.lectureIndex);
              });
            }
          }
        ]
      );
    } else {
      Alert.alert('No Attendance Found', 'There are no attendance records to delete for this date.');
    }
  }, [records, safeDeleteAttendanceRecord]);

  useEffect(() => {
    // Initialize profile if user is authenticated
    const initializeUser = async () => {
      const currentUser = await authService.getCurrentUser();
      if (currentUser && !profile) {
        profileService.initializeProfile(
          currentUser.uid,
          currentUser.email || '',
          currentUser.displayName || 'User'
        );
      }

      // Get current profile data to get user name
      const currentProfile = profileService.getCurrentProfile();
      if (currentProfile) {
        setUserName(currentProfile.displayName || 'Student');
      }
    };

    initializeUser();
  }, []);

  const handleQuickMarkAttendance = async (attended: boolean) => {
    console.log('handleQuickMarkAttendance called with attended:', attended, 'date:', selectedDate);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Use atomic markAllAttendance from context to avoid race conditions when marking many subjects
      // markAllAttendance will add a first lecture for subjects that have no eligible records for the date
      if (attended) {
        console.log('Marking all present for date:', selectedDate);
        markAllAttendance(selectedDate, 'present');
        await profileService.updateStreak(true);
      } else {
        console.log('Marking all absent for date:', selectedDate);
        markAllAttendance(selectedDate, 'absent');
        await profileService.updateStreak(false);
      }

      // Update notes if provided
      if (notes.trim()) {
        // You'll need to implement updateDayNotes in attendance context if not present
        // updateDayNotes(selectedDate, notes.trim());
      }

      router.back();
      Alert.alert('Success', `Attendance marked for ${formatDateFn(parseISO(selectedDate), 'MMMM d, yyyy')}`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const openSubjectMarkModal = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSubjectMarkDate(selectedDate);
    setPendingLectures({});
    setShowSubjectMarkModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLectureStatusChange = (lectureIndex: number, status: 'present' | 'absent' | 'no-lecture') => {
    if (selectedSubject) {
      markAttendance(selectedSubject, selectedDate, status, lectureIndex);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleAddLecture = () => {
    if (selectedSubject) {
      markAttendance(selectedSubject, selectedDate, 'present'); // adds new with next index
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // After adding lecture, immediately mark it as present in pending state
      setTimeout(() => {
        const lecturesAfter = records.filter(r => r.subjectId === selectedSubject && r.date === selectedDate).sort((a, b) => a.lectureIndex - b.lectureIndex);
        const newLecture = lecturesAfter[lecturesAfter.length - 1]; // Get the last added lecture
        if (newLecture) {
          setPendingLectures(prev => ({ ...prev, [newLecture.lectureIndex]: 'present' }));
        }
      }, 100); // Small delay to ensure the record is added
    }
  };

  const handleSavePending = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Object.entries(pendingLectures).forEach(([index, status]) => {
      handleLectureStatusChange(parseInt(index), status);
    });
    setPendingLectures({});
    setShowSubjectMarkModal(false);
  };

  const getStatusColor = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'safe': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'danger': return theme.colors.danger;
      default: return theme.colors.gray[500];
    }
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const lectures = useMemo(() => records.filter(r => r.subjectId === selectedSubject && r.date === selectedDate).sort((a, b) => a.lectureIndex - b.lectureIndex), [records, selectedSubject, selectedDate]);

  // Calculate existing attendance for display
  const subjectOverviews = subjects.map(subject => {
    const subjectRecords = records.filter(r => r.subjectId === subject.id && r.date === selectedDate && r.status !== 'no-lecture');
    const attended = subjectRecords.filter(r => r.status === 'present').length;
    const total = subjectRecords.length;
    const percentage = total > 0 ? (attended / total) * 100 : 0;
    return {
      subject,
      attended,
      total,
      percentage,
      status: percentage >= subject.targetPercentage ? 'safe' :
              percentage >= subject.targetPercentage - 5 ? 'warning' : 'danger'
    };
  });

  // Check if date is today
  const isToday = selectedDate === formatDateFn(new Date(), 'yyyy-MM-dd');


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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Mark Attendance
              </Text>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {formatDateFn(parseISO(selectedDate), 'MMMM d, yyyy')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.deleteButton]}
              onPress={() => deleteDayAttendance(selectedDate)}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions Card */}
          <LinearGradient
            colors={[theme.colors.pastel.purple, theme.colors.pastel.blue]}
            style={styles.quickActionsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.quickActionsTitle}>Quick Mark Attendance</Text>
            <Text style={styles.quickActionsSubtitle}>
              Mark all subjects for this day
            </Text>

            <View style={styles.quickActionsButtons}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.success }]}
                onPress={() => handleQuickMarkAttendance(true)}
              >
                <Ionicons name="checkmark" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Mark All Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.danger }]}
                onPress={() => handleQuickMarkAttendance(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Mark All Absent</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Notes Input */}
          <View style={[styles.notesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.notesInput, {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              placeholder="Add notes for this day (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Subject Overview */}
          {subjects.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Subject Attendance for {formatDateFn(parseISO(selectedDate), 'MMM d')}
              </Text>

              {subjectOverviews.map((overview) => (
                <TouchableOpacity
                  key={overview.subject.id}
                  style={[styles.subjectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => openSubjectMarkModal(overview.subject.id)}
                >
                  <View style={styles.subjectHeader}>
                    <View style={[styles.subjectColorDot, { backgroundColor: overview.subject.color }]} />
                    <Text style={[styles.subjectName, { color: theme.colors.text }]}>{overview.subject.name}</Text>
                    <TouchableOpacity style={styles.subjectMarkButton} onPress={() => openSubjectMarkModal(overview.subject.id)}>
                      <Ionicons name="add-circle" size={20} color={getStatusColor(overview.status as 'safe' | 'warning' | 'danger')} />
                    </TouchableOpacity>
                    {overview.total > 0 && (
                      <Text style={[styles.subjectPercentage, { color: getStatusColor(overview.status as 'safe' | 'warning' | 'danger') }]}>
                        {overview.attended}/{overview.total} ({overview.percentage.toFixed(0)}%)
                      </Text>
                    )}
                    {overview.total === 0 && (
                      <Text style={[styles.subjectPercentage, { color: theme.colors.textSecondary }]}>
                        No lectures
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {subjects.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={styles.emptyStateEmoji}>📚</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                No Subjects Available
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Go back and add subjects from the Subjects tab.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Subject Mark Modal */}
      <Modal
        visible={showSubjectMarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubjectMarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Mark Attendance for {subjects.find(s => s.id === selectedSubject)?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowSubjectMarkModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.dateSelector}>
                <Text style={[styles.dateLabel, { color: theme.colors.text }]}>Date:</Text>
                <Text style={[styles.dateDisplay, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}>
                  {formatDateFn(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
                </Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.lecturesContainer}>
                {lectures.map((lecture) => (
                  <View key={lecture.lectureIndex} style={styles.lectureItem}>
                    <View style={styles.lectureHeader}>
                      <Text style={[styles.lectureTitle, { color: theme.colors.text }]}>Lecture {lecture.lectureIndex}</Text>
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: theme.colors.gray[300] }]}
                        onPress={() => {
                          if (selectedSubject) {
                            safeDeleteAttendanceRecord(selectedSubject, selectedDate, lecture.lectureIndex);
                            // Also remove from pending if it was there
                            setPendingLectures(prev => {
                              const newPending = { ...prev };
                              delete newPending[lecture.lectureIndex];
                              return newPending;
                            });
                          }
                        }}
                      >
                        <Ionicons name="trash" size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.statusButtons}>
                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: theme.colors.success }, pendingLectures[lecture.lectureIndex] === 'present' ? styles.selected : {}]}
                        onPress={() => {
                          const newPending = { ...pendingLectures };
                          if (newPending[lecture.lectureIndex] === 'present') {
                            delete newPending[lecture.lectureIndex];
                          } else {
                            newPending[lecture.lectureIndex] = 'present';
                          }
                          setPendingLectures(newPending);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                        <Text style={styles.buttonText}>Present</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: theme.colors.danger }, pendingLectures[lecture.lectureIndex] === 'absent' ? styles.selected : {}]}
                        onPress={() => {
                          const newPending = { ...pendingLectures };
                          if (newPending[lecture.lectureIndex] === 'absent') {
                            delete newPending[lecture.lectureIndex];
                          } else {
                            newPending[lecture.lectureIndex] = 'absent';
                          }
                          setPendingLectures(newPending);
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.colors.white} />
                        <Text style={styles.buttonText}>Absent</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {Object.keys(pendingLectures).length > 0 && (
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.colors.success }]}
                    onPress={handleSavePending}
                  >
                    <Ionicons name="checkmark" size={24} color={theme.colors.white} />
                    <Text style={[styles.buttonText]}>Save Attendance</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddLecture}
                >
                  <Ionicons name="add" size={24} color={theme.colors.white} />
                  <Text style={[styles.buttonText]}>Add Lecture</Text>
                </TouchableOpacity>
              </ScrollView>
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 14,
    marginTop: 4,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  quickActionsSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
  },
  quickActionsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notesCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  subjectCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  subjectColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subjectName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  subjectMarkButton: {
    padding: 4,
  },
  subjectPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  dateSelector: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateDisplay: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  lecturesContainer: {
    flex: 1,
  },
  lectureItem: {
    marginBottom: 20,
  },
  lectureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
