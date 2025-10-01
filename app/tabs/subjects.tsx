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
import { Plus, Trash2, Edit2, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAttendance } from '@/contexts/AttendanceContext';
import { AppColors, SubjectColors } from '@/constants/colors';

export default function SubjectsScreen() {
  const insets = useSafeAreaInsets();
  const { subjects, addSubject, updateSubject, deleteSubject, getSubjectStats } = useAttendance();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(SubjectColors[0]);

  const handleAddSubject = () => {
    if (subjectName.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      addSubject(subjectName.trim(), selectedColor);
      setSubjectName('');
      setSelectedColor(SubjectColors[0]);
      setShowAddModal(false);
    }
  };

  const handleEditSubject = () => {
    if (editingSubject && subjectName.trim()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      updateSubject(editingSubject, { name: subjectName.trim(), color: selectedColor });
      setSubjectName('');
      setSelectedColor(SubjectColors[0]);
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
    setShowAddModal(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const openEditModal = (id: string, name: string, color: string) => {
    setEditingSubject(id);
    setSubjectName(name);
    setSelectedColor(color);
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
                        style={styles.actionButton}
                        onPress={() => openEditModal(subject.id, subject.name, subject.color)}
                      >
                        <Edit2 color={AppColors.primary} size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteSubject(subject.id, subject.name)}
                      >
                        <Trash2 color={AppColors.danger} size={20} />
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

              <TouchableOpacity
                style={[styles.saveButton, !subjectName.trim() && styles.saveButtonDisabled]}
                onPress={editingSubject ? handleEditSubject : handleAddSubject}
                disabled={!subjectName.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {editingSubject ? 'Save Changes' : 'Add Subject'}
                </Text>
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
    backgroundColor: AppColors.gray[50],
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
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: AppColors.white,
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
    color: AppColors.gray[900],
    marginBottom: 4,
  },
  subjectStats: {
    fontSize: 14,
    color: AppColors.gray[600],
  },
  subjectActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AppColors.gray[100],
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
    backgroundColor: AppColors.gray[200],
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
    color: AppColors.gray[600],
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
    color: AppColors.gray[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: AppColors.gray[100],
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: AppColors.gray[900],
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
    borderColor: AppColors.gray[900],
  },
  saveButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: AppColors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
