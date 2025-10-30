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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format as formatDateFn } from 'date-fns';
import { Plus, Trash2, Edit2, BookOpen, CheckCircle, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AppColors, SubjectColors } from '@/constants/colors';

export default function SubjectsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { subjects, addSubject, updateSubject, deleteSubject, getSubjectStats, markAttendance } = useAttendance();
  const styles = createStyles(theme);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(SubjectColors[0]);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [showMarkModal, setShowMarkModal] = useState<boolean>(false);
  const [markingSubject, setMarkingSubject] = useState<string | null>(null);
  const [markDate, setMarkDate] = useState<string>(formatDateFn(new Date(), 'yyyy-MM-dd'));
  const [errors, setErrors] = useState<{name?: string}>({});

  // Determine if form is valid for submit button
  const isFormValid = subjectName.trim() && !errors.name;

  const validateForm = () => {
    const newErrors: {name?: string} = {};

    if (!subjectName.trim()) {
      newErrors.name = 'Subject name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSubject = () => {
    if (validateForm()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      addSubject(subjectName.trim(), selectedColor, targetPercentage);
      setSubjectName('');
      setSelectedColor(SubjectColors[0]);
      setTargetPercentage(75);
      setErrors({});
      setShowAddModal(false);
    }
  };

  const handleEditSubject = () => {
    if (editingSubject && validateForm()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      updateSubject(editingSubject, { name: subjectName.trim(), color: selectedColor, targetPercentage });
      setSubjectName('');
      setSelectedColor(SubjectColors[0]);
      setTargetPercentage(75);
      setErrors({});
      setEditingSubject(null);
      setShowAddModal(false);
    }
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Delete ${name}? This will remove all attendance records for this subject.`)) {
        deleteSubject(id);
      }
    } else {
      Alert.alert(
        'Delete Subject',
        `Delete ${name}? This will remove all attendance records for this subject.`,
        [
          { text: 'Cancel', style: 'cancel' as const },
          {
            text: 'Delete',
            style: 'destructive' as const,
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              deleteSubject(id);
            },
          },
        ]
      );
    }
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSelectedColor(SubjectColors[0]);
    setTargetPercentage(75);
    setErrors({});
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const openEditModal = (id: string, name: string, color: string, target: number = 75) => {
    setEditingSubject(id);
    setSubjectName(name);
    setSelectedColor(color);
    setTargetPercentage(target);
    setErrors({});
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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

  const handleMarkAttendance = (attended: boolean) => {
    if (markingSubject) {
      // convert boolean to status string expected by markAttendance
      const status = attended ? 'present' : 'absent';
      markAttendance(markingSubject, markDate, status);
      setShowMarkModal(false);
      setMarkingSubject(null);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Subjects</Text>
          <Text style={styles.headerSubtitle}>Manage your courses</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus color={AppColors.white} size={24} />
            <Text style={styles.addButtonText}>Add Subject</Text>
          </TouchableOpacity>

          {subjects.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen color={AppColors.gray[400]} size={48} />
              <Text style={styles.emptyStateTitle}>No subjects yet</Text>
              <Text style={styles.emptyStateText}>
                Add your first subject to start tracking attendance
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
                      <View style={styles.subjectTextInfo}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        <Text style={styles.subjectStats}>
                          {stats.attended} / {stats.total} classes
                        </Text>
                      </View>
                    </View>
                    <View style={styles.subjectActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                        onPress={() => {
                          setMarkingSubject(subject.id);
                          setMarkDate(formatDateFn(new Date(), 'yyyy-MM-dd'));
                          setShowMarkModal(true);
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                        }}
                      >
                        <CheckCircle color={theme.colors.success} size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                        onPress={() => openEditModal(subject.id, subject.name, subject.color, subject.targetPercentage)}
                      >
                        <Edit2 color={theme.colors.primary} size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
                        onPress={() => handleDeleteSubject(subject.id, subject.name)}
                      >
                        <Trash2 color={theme.colors.danger} size={20} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
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
                    <Text style={[styles.percentageText, { color: getStatusColor(stats.status) }]}>
                      {stats.percentage.toFixed(1)}%
                    </Text>
                  </View>

                  {stats.status === 'safe' && stats.canMiss > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: AppColors.success + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: AppColors.success }]}>
                        Can miss {stats.canMiss} more {stats.canMiss === 1 ? 'class' : 'classes'}
                      </Text>
                    </View>
                  )}

                  {stats.status !== 'safe' && stats.needToAttend > 0 && (
                    <View style={[styles.statusBadge, { backgroundColor: AppColors.danger + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: AppColors.danger }]}>
                        Need {stats.needToAttend} more {stats.needToAttend === 1 ? 'class' : 'classes'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Subject Name</Text>
                <TextInput
                  style={styles.input}
                  value={subjectName}
                  onChangeText={setSubjectName}
                  placeholder="e.g., Mathematics"
                  autoFocus
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {SubjectColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedColor(color);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Target Attendance (%)</Text>
                <TextInput
                  style={styles.input}
                  value={targetPercentage.toString()}
                  onChangeText={(text) => setTargetPercentage(parseInt(text) || 75)}
                  placeholder="75"
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
                onPress={editingSubject ? handleEditSubject : handleAddSubject}
                disabled={!isFormValid}
              >
                <Text style={styles.saveButtonText}>
                  {editingSubject ? 'Save Changes' : 'Add Subject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Mark Attendance
              </Text>
              <TouchableOpacity
                onPress={() => setShowMarkModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={markDate}
                  onChangeText={setMarkDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <Text style={[styles.inputLabel, { marginBottom: 16 }]}>
                Select Attendance
              </Text>

              <View style={styles.attendanceButtons}>
                <TouchableOpacity
                  style={[styles.attendanceButton, { backgroundColor: AppColors.success }]}
                  onPress={() => handleMarkAttendance(true)}
                >
                  <CheckCircle color={AppColors.white} size={24} />
                  <Text style={styles.attendanceButtonText}>Present</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attendanceButton, { backgroundColor: AppColors.danger }]}
                  onPress={() => handleMarkAttendance(false)}
                >
                  <XCircle color={AppColors.white} size={24} />
                  <Text style={styles.attendanceButtonText}>Absent</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Create styles function that takes theme as parameter
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 16,
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
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    paddingHorizontal: 40,
  },
  subjectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
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
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  subjectTextInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 4,
  },
  subjectStats: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  subjectActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  progressSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.gray[300],
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700' as const,
    minWidth: 60,
    textAlign: 'right' as const,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
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
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600' as const,
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.gray[200],
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  attendanceButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  attendanceButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
