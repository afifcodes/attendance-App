import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Animated,
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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [showQuickMarkModal, setShowQuickMarkModal] = useState(false);
  const [showSubjectMarkModal, setShowSubjectMarkModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectMarkDate, setSubjectMarkDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [userName, setUserName] = useState<string>('Student');

  // Always use current date for quick attendance marking
  const currentDate = new Date().toISOString().split('T')[0];

  const { subjects, records, getOverallStats, markAllAttendance, toggleHoliday, updateDayNotes, markAttendance } = useAttendance();

  useEffect(() => {
    // Initialize profile if user is authenticated
    const currentUser = authService.getCurrentUser();
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
  }, []);

  const handleQuickMarkAttendance = async (attended: boolean, date?: string) => {
    console.log('handleQuickMarkAttendance called with attended:', attended, 'date:', date);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const markDate = date || selectedDate;
    console.log('markDate:', markDate, 'subjects length:', subjects.length);

    try {
      if (attended) {
        console.log('Marking all present');
        markAllAttendance(markDate, 'present');
        await profileService.updateStreak(true);
      } else {
        console.log('Marking all absent');
        markAllAttendance(markDate, 'absent');
        await profileService.updateStreak(false);
      }

      // Update notes if provided
      if (notes.trim()) {
        updateDayNotes(markDate, notes.trim());
      }

      await profileService.checkAchievements();

      setShowQuickMarkModal(false);
      setNotes('');
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const handleToggleHoliday = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleHoliday(selectedDate);
    setShowQuickMarkModal(false);
  };

  const openSubjectMarkModal = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSubjectMarkDate(new Date().toISOString().split('T')[0]);
    setShowSubjectMarkModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLectureStatusChange = (lectureIndex: number, status: 'present' | 'absent' | 'no-lecture') => {
    if (selectedSubject) {
      markAttendance(selectedSubject, subjectMarkDate, status, lectureIndex);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleAddLecture = () => {
    if (selectedSubject) {
      markAttendance(selectedSubject, subjectMarkDate, 'present'); // adds new with next index
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '👑';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⭐';
    return '📚';
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

  const overallStats = getOverallStats();

  const lectures = useMemo(() => records.filter(r => r.subjectId === selectedSubject && r.date === subjectMarkDate).sort((a, b) => a.lectureIndex - b.lectureIndex), [records, selectedSubject, subjectMarkDate]);

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
            <View>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                {userName !== 'Student' ? `${getGreeting()}, ${userName}!` : 'Good Evening, Student!'}
              </Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: theme.colors.pastel.orange }]}>
              <Text style={styles.streakEmoji}>📚</Text>
              <Text style={[styles.streakText, { color: theme.colors.text }]}>
                0 day streak
              </Text>
            </View>
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
              Mark all subjects for {new Date().toLocaleDateString()}
            </Text>

            <View style={styles.quickActionsButtons}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.success }]}
                onPress={() => handleQuickMarkAttendance(true, currentDate)}
              >
                <Ionicons name="checkmark" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Mark All Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.danger }]}
                onPress={() => handleQuickMarkAttendance(false, currentDate)}
              >
                <Ionicons name="close" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Mark All Absent</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Overall Stats Card */}
          <View style={[styles.statsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Overall Attendance</Text>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.gray[200] }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(overallStats.percentage, 100)}%`,
                      backgroundColor: getStatusColor(overallStats.status),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.percentageText, { color: getStatusColor(overallStats.status) }]}>
                {overallStats.percentage.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{overallStats.attended}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Attended</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{overallStats.total}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: getStatusColor(overallStats.status) }]}>
                  {overallStats.canMiss}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Can Miss</Text>
              </View>
            </View>
          </View>

          {/* Empty State */}
          {subjects.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={styles.emptyStateEmoji}>📚</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                Welcome to Your Attendance Tracker!
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Get started by adding your subjects from the Subjects tab below.
              </Text>
            </View>
          )}

          {/* Subject Overview */}
          {subjects.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Subject Overview</Text>

              {subjects.map((subject) => {
                const subjectPercentage = subject.totalClasses > 0 ? (subject.attendedClasses / subject.totalClasses) * 100 : 0;
                const subjectStatus = subjectPercentage >= subject.targetPercentage ? 'safe' :
                                    subjectPercentage >= subject.targetPercentage - 5 ? 'warning' : 'danger';

                return (
                  <TouchableOpacity key={subject.id} style={[styles.subjectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => openSubjectMarkModal(subject.id)}>
                    <View style={styles.subjectHeader}>
                      <View style={[styles.subjectColorDot, { backgroundColor: subject.color }]} />
                      <Text style={[styles.subjectName, { color: theme.colors.text }]}>{subject.name}</Text>
                      <TouchableOpacity style={styles.subjectMarkButton} onPress={() => openSubjectMarkModal(subject.id)}>
                        <Ionicons name="add-circle" size={20} color={getStatusColor(subjectStatus)} />
                      </TouchableOpacity>
                      <Text style={[styles.subjectPercentage, { color: getStatusColor(subjectStatus) }]}>
                        {subjectPercentage.toFixed(1)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Quick Mark Modal */}
      <Modal
        visible={showQuickMarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickMarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Mark Attendance</Text>
              <TouchableOpacity onPress={() => setShowQuickMarkModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.dateSelector}>
                <Text style={[styles.dateLabel, { color: theme.colors.text }]}>Date:</Text>
                <TextInput
                  style={[styles.dateInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.success }]}
                  onPress={() => handleQuickMarkAttendance(true)}
                >
                  <Ionicons name="checkmark" size={20} color={theme.colors.white} />
                  <Text style={styles.modalButtonText}>Mark All Present</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.danger }]}
                  onPress={() => handleQuickMarkAttendance(false)}
                >
                  <Ionicons name="close" size={20} color={theme.colors.white} />
                  <Text style={styles.modalButtonText}>Mark All Absent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.warning }]}
                  onPress={handleToggleHoliday}
                >
                  <Ionicons name="calendar" size={20} color={theme.colors.white} />
                  <Text style={styles.modalButtonText}>Mark as Holiday</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
                <TextInput
                  style={[styles.dateInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={subjectMarkDate}
                  onChangeText={setSubjectMarkDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {lectures.map((lecture) => (
                  <View key={lecture.lectureIndex} style={styles.lectureItem}>
                    <Text style={[styles.lectureTitle, { color: theme.colors.text }]}>Lecture {lecture.lectureIndex}</Text>
                    <View style={styles.statusButtons}>
                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: theme.colors.success }, lecture.status === 'present' ? styles.selected : {}]}
                        onPress={() => handleLectureStatusChange(lecture.lectureIndex, 'present')}
                      >
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                        <Text style={styles.buttonText}>Present</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: theme.colors.danger }, lecture.status === 'absent' ? styles.selected : {}]}
                        onPress={() => handleLectureStatusChange(lecture.lectureIndex, 'absent')}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.colors.white} />
                        <Text style={styles.buttonText}>Absent</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: theme.colors.warning }, lecture.status === 'no-lecture' ? styles.selected : {}]}
                        onPress={() => handleLectureStatusChange(lecture.lectureIndex, 'no-lecture')}
                      >
                        <Ionicons name="remove-circle" size={20} color={theme.colors.white} />
                        <Text style={styles.buttonText}>No Lecture</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
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
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 8,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  attendanceButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  attendanceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dateSelector: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  lectureItem: {
    marginBottom: 20,
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
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
