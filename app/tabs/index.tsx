import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, AlertCircle, CheckCircle, TrendingUp, Calendar as CalendarIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAttendance } from '@/contexts/AttendanceContext';
import { AppColors } from '@/constants/colors';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { subjects, getOverallStats, getSubjectStats, markAttendance, targetPercentage, isLoading } = useAttendance();
  const [showMarkModal, setShowMarkModal] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const overallStats = getOverallStats();

  const handleMarkAttendance = (subjectId: string, attended: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    markAttendance(subjectId, selectedDate, attended);
  };

  const getStatusColor = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'safe':
        return AppColors.success;
      case 'warning':
        return AppColors.warning;
      case 'danger':
        return AppColors.danger;
    }
  };

  const getStatusIcon = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'safe':
        return CheckCircle;
      case 'warning':
      case 'danger':
        return AlertCircle;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance Tracker</Text>
          <Text style={styles.headerSubtitle}>Track your {targetPercentage}% goal</Text>
        </View>

        <LinearGradient
          colors={[getStatusColor(overallStats.status), getStatusColor(overallStats.status) + 'CC']}
          style={styles.overallCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.overallCardContent}>
            <View style={styles.overallCardHeader}>
              <Text style={styles.overallCardTitle}>Overall Attendance</Text>
              {React.createElement(getStatusIcon(overallStats.status), {
                color: AppColors.white,
                size: 24,
              })}
            </View>
            <Text style={styles.overallPercentage}>
              {overallStats.percentage.toFixed(1)}%
            </Text>
            <Text style={styles.overallStats}>
              {overallStats.attended} / {overallStats.total} classes attended
            </Text>

            {overallStats.status === 'safe' && overallStats.canMiss > 0 && (
              <View style={styles.predictionBox}>
                <TrendingUp color={AppColors.white} size={16} />
                <Text style={styles.predictionText}>
                  You can miss {overallStats.canMiss} more {overallStats.canMiss === 1 ? 'class' : 'classes'}
                </Text>
              </View>
            )}

            {overallStats.status !== 'safe' && overallStats.needToAttend > 0 && (
              <View style={styles.predictionBox}>
                <AlertCircle color={AppColors.white} size={16} />
                <Text style={styles.predictionText}>
                  Attend next {overallStats.needToAttend} {overallStats.needToAttend === 1 ? 'class' : 'classes'} to reach {targetPercentage}%
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subjects</Text>
            <TouchableOpacity
              style={styles.markButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setShowMarkModal(true);
              }}
            >
              <Plus color={AppColors.white} size={20} />
              <Text style={styles.markButtonText}>Mark Today</Text>
            </TouchableOpacity>
          </View>

          {subjects.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarIcon color={AppColors.gray[400]} size={48} />
              <Text style={styles.emptyStateTitle}>No subjects yet</Text>
              <Text style={styles.emptyStateText}>
                Add subjects from the Subjects tab to start tracking
              </Text>
            </View>
          ) : (
            subjects.map((subject) => {
              const stats = getSubjectStats(subject.id);
              return (
                <View key={subject.id} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectInfo}>
                      <View style={[styles.subjectColorDot, { backgroundColor: subject.color }]} />
                      <Text style={styles.subjectName}>{subject.name}</Text>
                    </View>
                    <View style={styles.subjectPercentageContainer}>
                      <Text style={[styles.subjectPercentage, { color: getStatusColor(stats.status) }]}>
                        {stats.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(stats.percentage, 100)}%`,
                            backgroundColor: getStatusColor(stats.status),
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.subjectStats}>
                    <Text style={styles.subjectStatsText}>
                      {stats.attended} / {stats.total} classes
                    </Text>
                    {stats.status === 'safe' && stats.canMiss > 0 && (
                      <Text style={[styles.subjectStatsText, { color: AppColors.success }]}>
                        Can miss {stats.canMiss}
                      </Text>
                    )}
                    {stats.status !== 'safe' && stats.needToAttend > 0 && (
                      <Text style={[styles.subjectStatsText, { color: AppColors.danger }]}>
                        Need {stats.needToAttend} more
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showMarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Attendance</Text>
              <TouchableOpacity
                onPress={() => setShowMarkModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Date</Text>
              <TextInput
                style={styles.dateInput}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <ScrollView style={styles.modalScrollView}>
              {subjects.map((subject) => (
                <View key={subject.id} style={styles.modalSubjectCard}>
                  <View style={styles.modalSubjectHeader}>
                    <View style={[styles.subjectColorDot, { backgroundColor: subject.color }]} />
                    <Text style={styles.modalSubjectName}>{subject.name}</Text>
                  </View>
                  <View style={styles.attendanceButtons}>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.presentButton]}
                      onPress={() => handleMarkAttendance(subject.id, true)}
                    >
                      <Text style={styles.attendanceButtonText}>Present</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceButton, styles.absentButton]}
                      onPress={() => handleMarkAttendance(subject.id, false)}
                    >
                      <Text style={styles.attendanceButtonText}>Absent</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: AppColors.gray[600],
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
    fontWeight: '700' as const,
    color: AppColors.gray[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: AppColors.gray[600],
  },
  overallCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  overallCardContent: {
    gap: 8,
  },
  overallCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  overallCardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: AppColors.white,
  },
  overallPercentage: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: AppColors.white,
    marginVertical: 8,
  },
  overallStats: {
    fontSize: 16,
    color: AppColors.white,
    opacity: 0.9,
  },
  predictionBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  predictionText: {
    fontSize: 14,
    color: AppColors.white,
    fontWeight: '500' as const,
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: AppColors.gray[900],
  },
  markButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  markButtonText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: AppColors.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: AppColors.gray[600],
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  subjectCard: {
    backgroundColor: AppColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  subjectInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  subjectColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: AppColors.gray[900],
    flex: 1,
  },
  subjectPercentageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: AppColors.gray[100],
  },
  subjectPercentage: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: AppColors.gray[200],
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  subjectStatsText: {
    fontSize: 14,
    color: AppColors.gray[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray[200],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: AppColors.gray[900],
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600' as const,
  },
  dateInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AppColors.gray[700],
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: AppColors.gray[100],
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: AppColors.gray[900],
  },
  modalScrollView: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalSubjectCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray[100],
  },
  modalSubjectHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  modalSubjectName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppColors.gray[900],
  },
  attendanceButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  attendanceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  presentButton: {
    backgroundColor: AppColors.success,
  },
  absentButton: {
    backgroundColor: AppColors.danger,
  },
  attendanceButtonText: {
    color: AppColors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
