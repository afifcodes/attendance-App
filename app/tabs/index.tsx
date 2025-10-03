import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { themeService, type Theme } from '@/services/theme';
import { profileService } from '@/services/profile';
import { authService } from '@/services/auth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { AnimationService } from '@/services/animations';
import type { UserProfile } from '@/types/User';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [theme, setTheme] = useState<Theme>(themeService.getCurrentTheme());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showQuickMarkModal, setShowQuickMarkModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const { subjects, records, getOverallStats, markAttendance, markAllAttendance, isHoliday, toggleHoliday, updateDayNotes } = useAttendance();

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.9);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    const unsubscribeTheme = themeService.subscribe(setTheme);
    const unsubscribeProfile = profileService.subscribe(setProfile);
    
    // Initialize profile if user is authenticated
    const currentUser = authService.getCurrentUser();
    if (currentUser && !profile) {
      profileService.initializeProfile(
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || 'User'
      );
    }
    
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: AnimationService.createSlideInAnimation().slideIn,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate progress bar
    const overallStats = getOverallStats();
    Animated.timing(progressAnim, {
      toValue: overallStats.percentage / 100,
      duration: 1000,
      easing: AnimationService.createProgressAnimation().animateTo,
      useNativeDriver: false,
    }).start();

    return () => {
      unsubscribeTheme();
      unsubscribeProfile();
    };
  }, []);

  const handleQuickMarkAttendance = async (attended: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (attended) {
        markAllAttendance(selectedDate, true);
        await profileService.updateStreak(true);
      } else {
        markAllAttendance(selectedDate, false);
        await profileService.updateStreak(false);
      }

      // Update notes if provided
      if (notes.trim()) {
        updateDayNotes(selectedDate, notes.trim());
      }

      // Check for new achievements
      await profileService.checkAchievements();

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          attended 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Warning
        );
      }

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

  const overallStats = getOverallStats();
  const todayRecords = records.filter(r => r.date === selectedDate);
  const todayIsHoliday = isHoliday(selectedDate);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
              </Text>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {profile?.displayName || 'Student'}
              </Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: theme.colors.pastel.orange }]}>
              <Text style={styles.streakEmoji}>{getStreakEmoji(profile?.streakCount || 0)}</Text>
              <Text style={[styles.streakText, { color: theme.colors.text }]}>
                {profile?.streakCount || 0} day streak
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
                onPress={() => handleQuickMarkAttendance(true)}
              >
                <Ionicons name="checkmark" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Present</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.danger }]}
                onPress={() => handleQuickMarkAttendance(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Absent</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.colors.warning }]}
                onPress={() => setShowQuickMarkModal(true)}
              >
                <Ionicons name="calendar" size={24} color={theme.colors.white} />
                <Text style={styles.quickActionButtonText}>Custom</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Overall Stats Card */}
          <View style={[styles.statsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Overall Attendance</Text>
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.gray[200] }]}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
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

          {/* Subject Overview */}
          {subjects.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Subject Overview</Text>
              
              {subjects.slice(0, 3).map((subject) => {
                const subjectStats = subjects.reduce((acc, s) => {
                  if (s.id === subject.id) {
                    const percentage = s.totalClasses > 0 ? (s.attendedClasses / s.totalClasses) * 100 : 0;
                    acc = { percentage, status: percentage >= s.targetPercentage ? 'safe' : percentage >= s.targetPercentage - 5 ? 'warning' : 'danger' };
                  }
                  return acc;
                }, { percentage: 0, status: 'safe' as const });

                return (
                  <View key={subject.id} style={[styles.subjectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={styles.subjectHeader}>
                      <View style={[styles.subjectColorDot, { backgroundColor: subject.color }]} />
                      <Text style={[styles.subjectName, { color: theme.colors.text }]}>{subject.name}</Text>
                      <Text style={[styles.subjectPercentage, { color: getStatusColor(subjectStats.status) }]}>
                        {subjectStats.percentage.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={[styles.subjectProgressBar, { backgroundColor: theme.colors.gray[200] }]}>
                      <View
                        style={[
                          styles.subjectProgressFill,
                          {
                            width: `${Math.min(subjectStats.percentage, 100)}%`,
                            backgroundColor: getStatusColor(subjectStats.status),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
              
              {subjects.length > 3 && (
                <TouchableOpacity style={[styles.viewAllButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.viewAllButtonText}>View All Subjects</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Today's Records */}
          {todayRecords.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Attendance</Text>
              
              {todayRecords.map((record) => {
                const subject = subjects.find(s => s.id === record.subjectId);
                return (
                  <View key={record.id} style={[styles.recordCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={[styles.recordIcon, { backgroundColor: record.attended ? theme.colors.success + '20' : theme.colors.danger + '20' }]}>
                      <Ionicons 
                        name={record.attended ? 'checkmark' : 'close'} 
                        size={20} 
                        color={record.attended ? theme.colors.success : theme.colors.danger} 
                      />
                    </View>
                    <View style={styles.recordInfo}>
                      <Text style={[styles.recordSubject, { color: theme.colors.text }]}>
                        {subject?.name || 'Unknown Subject'}
                      </Text>
                      <Text style={[styles.recordStatus, { color: record.attended ? theme.colors.success : theme.colors.danger }]}>
                        {record.attended ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
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
              
              <View style={styles.notesContainer}>
                <Text style={[styles.notesLabel, { color: theme.colors.text }]}>Notes (Optional):</Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes for this day..."
                  multiline
                  numberOfLines={3}
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
  subjectPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  subjectProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  viewAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recordStatus: {
    fontSize: 14,
    fontWeight: '500',
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
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
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
});