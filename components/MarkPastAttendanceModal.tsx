import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import { useAttendance } from '@/contexts/AttendanceContext';
import { Subject, AttendanceRecord, LectureEntry, DayAttendanceSummary } from '@/types/Attendance';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { format } from 'date-fns';
import Dropdown from './Dropdown'; // Assuming a Dropdown component exists
import Button from './Button'; // Assuming a Button component exists
import useToast from '@/utils/useToast'; // Assuming a useToast hook exists

interface MarkPastAttendanceModalProps {
  isVisible: boolean;
  date: string | null; // Date in 'YYYY-MM-DD' format
  onClose: () => void;
}

// Helper function to transform raw records into the summary format for the UI
const getDayAttendanceSummary = (records: AttendanceRecord[], subjects: Subject[]): DayAttendanceSummary[] => {
  const summaryMap = new Map<string, { lectures: number; attended: number }>();

  records.forEach(record => {
    if (record.status === 'no-lecture') return;

    const key = record.subjectId;
    const current = summaryMap.get(key) || { lectures: 0, attended: 0 };

    current.lectures += 1;
    if (record.status === 'present') {
      current.attended += 1;
    }
    summaryMap.set(key, current);
  });

  return Array.from(summaryMap.entries()).map(([subjectId, data]) => {
    const subject = subjects.find(s => s.id === subjectId);
    return {
      subject: subject?.name || 'Unknown Subject',
      lectures: data.lectures,
      attended: data.attended,
    };
  });
};

// Helper function to transform summary back to LectureEntry for saving
const summaryToLectureEntry = (summary: DayAttendanceSummary[], subjects: Subject[]): LectureEntry[] => {
  return summary.map(item => {
    const subject = subjects.find(s => s.name === item.subject);
    return {
      subjectId: subject?.id || '', // Should not happen if using dropdown
      lectures: item.lectures,
      attended: item.attended,
    };
  }).filter(entry => entry.subjectId !== '');
};

const MarkPastAttendanceModal: React.FC<MarkPastAttendanceModalProps> = ({ isVisible, date, onClose }) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { subjects, getRecordsForDate, saveDayAttendance } = useAttendance();
  const toast = useToast();
  const [attendanceEntries, setAttendanceEntries] = useState<DayAttendanceSummary[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const firstRowRef = useRef<any>(null);

  const subjectOptions = useMemo(() => subjects.map(s => ({ label: s.name, value: s.id })), [subjects]);

  const recordsForDate = date ? getRecordsForDate(date) : [];

  useEffect(() => {
    if (isVisible && date) {
      // Initialize state from existing records
      const initialSummary = getDayAttendanceSummary(recordsForDate, subjects);
      setAttendanceEntries(initialSummary.length > 0 ? initialSummary : [{ subject: '', lectures: 1, attended: 1 }]);

      // Move accessibility focus to the first row for keyboard/voiceover users
      setTimeout(() => {
        try {
          const node = findNodeHandle(firstRowRef.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        } catch (e) {
          // ignore if Dropdown doesn't support focus
        }
      }, 300);
    }
  }, [isVisible, date, recordsForDate, subjects]);

  const handleAddLecture = useCallback(() => {
    // Auto-add one entry if none exist, otherwise add a new one
    if (attendanceEntries.length === 0) {
      setAttendanceEntries([{ subject: '', lectures: 1, attended: 1 }]);
    } else {
      setAttendanceEntries(prev => [...prev, { subject: '', lectures: 1, attended: 1 }]);
    }
  }, [attendanceEntries]);

  const handleRemoveLecture = useCallback((index: number) => {
    setAttendanceEntries(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateEntry = useCallback((index: number, field: keyof DayAttendanceSummary, value: any) => {
    setAttendanceEntries(prev => prev.map((entry, i) => (
      i === index ? { ...entry, [field]: value } : entry
    )));
  }, []);

  const handleSave = async () => {
    if (!date) return;

    const validEntries = attendanceEntries.filter(e => e.subject && e.lectures > 0);
    if (validEntries.length === 0) {
      toast.show('Please add at least one valid lecture entry.', 'error');
      return;
    }

    // Map subject names to ids and detect missing subjects
    const entriesToSave: LectureEntry[] = [];
    const missingSubjects: string[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();

    validEntries.forEach(item => {
      const subject = subjects.find(s => s.name === item.subject);
      if (!subject) {
        missingSubjects.push(item.subject || 'Unknown');
        return;
      }
      if (seen.has(subject.id)) {
        duplicates.push(subject.name);
        return;
      }
      seen.add(subject.id);
      entriesToSave.push({ subjectId: subject.id, lectures: item.lectures, attended: item.attended });
    });

    if (missingSubjects.length > 0) {
      toast.show(`Some subjects were not recognized and were skipped: ${missingSubjects.join(', ')}`, 'info');
    }
    if (duplicates.length > 0) {
      toast.show(`Duplicate subjects ignored: ${duplicates.join(', ')}`, 'info');
    }

    if (entriesToSave.length === 0) {
      toast.show('No valid entries to save after validation.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // saveDayAttendance updates context and recalculates stats synchronously
      await saveDayAttendance(date, entriesToSave);
      toast.show('Attendance saved successfully!', 'success');
      onClose();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.show('Failed to save attendance.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
      margin: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'stretch',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '92%',
      maxHeight: '82%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    dateText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    entryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingVertical: 10,
      paddingHorizontal: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
      opacity: 0.4,
    },
    subjectSelector: {
      flex: 3,
      marginRight: 10,
    },
    lectureInput: {
      flex: 1,
      marginRight: 10,
      textAlign: 'center',
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    toggleButton: {
      flex: 2,
      padding: 8,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    present: {
      backgroundColor: colors.success,
    },
    absent: {
      backgroundColor: colors.danger,
    },
    toggleText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    removeButton: {
      marginLeft: 10,
      padding: 6,
    },
    headerRightIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconButton: {
      padding: 6,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButton: {
      marginTop: 6,
      marginBottom: 12,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    saveButton: {
      marginTop: 8,
    },
    /* counter styles for lecture +/- */
    counterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flex: 1,
      marginRight: 10,
    },
    counterButton: {
      padding: 4,
    },
    counterText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      minWidth: 28,
      textAlign: 'center',
    },
  });

  const formatDate = (dateString: string) => {
    try {
      // Assuming date is in 'YYYY-MM-DD' format
      const [year, month, day] = dateString.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(dateObj, 'EEEE, MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const LectureEntryRow: React.FC<{ entry: DayAttendanceSummary, index: number }> = ({ entry, index }) => {
    const isPresent = entry.attended === entry.lectures;
    const isAbsent = entry.attended === 0;

    const toggleStatus = () => {
      if (isPresent) {
        // If present, switch to absent (0 attended)
        handleUpdateEntry(index, 'attended', 0);
      } else {
        // If absent or mixed, switch to present (all attended)
        handleUpdateEntry(index, 'attended', entry.lectures);
      }
    };

    return (
      <View style={styles.entryContainer}>
        <View style={styles.subjectSelector}>
          <Dropdown
            options={subjectOptions}
            selectedValue={subjects.find(s => s.name === entry.subject)?.id || ''}
            onValueChange={(subjectId: string) => {
              const subjectName = subjects.find(s => s.id === subjectId)?.name || '';
              handleUpdateEntry(index, 'subject', subjectName);
            }}
            placeholder="Select Subject"
          />
        </View>
        {/* Lecture counter: - / count / + */}
        <View style={styles.counterContainer}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => {
              if (entry.lectures <= 1) return;
              const newLectures = entry.lectures - 1;
              // adjust attended if it exceeds new lectures
              const newAttended = Math.min(entry.attended, newLectures);
              handleUpdateEntry(index, 'lectures', newLectures);
              handleUpdateEntry(index, 'attended', newAttended);
            }}
          >
            <Ionicons name="remove-circle" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.counterText}>{entry.lectures}</Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => {
              const newLectures = entry.lectures + 1;
              // if previously all present, keep them present for the new lecture as well
              const newAttended = entry.attended === entry.lectures ? entry.attended + 1 : entry.attended;
              handleUpdateEntry(index, 'lectures', newLectures);
              handleUpdateEntry(index, 'attended', newAttended);
            }}
          >
            <Ionicons name="add-circle" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.toggleButton, isPresent ? styles.present : styles.absent]}
          onPress={toggleStatus}
        >
          <Text style={styles.toggleText}>{isPresent ? 'Present' : isAbsent ? 'Absent' : `${entry.attended}/${entry.lectures}`}</Text>
        </TouchableOpacity>
        {attendanceEntries.length > 1 && (
          <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveLecture(index)} accessibilityLabel={`Remove row ${index + 1}`}>
            <Ionicons name="close-circle" size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Mark Past Attendance</Text>
            <View style={styles.headerRightIcons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleAddLecture}
                accessibilityLabel="Add lecture row"
              >
                <Ionicons name="add" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSave}
                accessibilityLabel="Save attendance"
                disabled={isSaving || attendanceEntries.filter(e => e.subject && e.lectures > 0).length === 0}
              >
                <Ionicons name={isSaving ? 'hourglass' : 'save'} size={22} color={isSaving ? colors.textSecondary : colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={onClose} accessibilityLabel="Close dialog">
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {date && <Text style={styles.dateText}>Date: {formatDate(date)}</Text>}

          <ScrollView keyboardShouldPersistTaps="handled">
            {attendanceEntries.map((entry, index) => (
              <React.Fragment key={index}>
                <LectureEntryRow entry={entry} index={index} />
                {index < attendanceEntries.length - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default MarkPastAttendanceModal;