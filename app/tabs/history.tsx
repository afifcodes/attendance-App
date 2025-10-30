import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format as formatDateFn } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAttendance } from '@/contexts/AttendanceContext';
import { useTheme } from '@/contexts/ThemeContext';
import { AppColors } from '@/constants/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { subjects, getRecordsForDate } = useAttendance();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const styles = createStyles(theme);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

  const previousMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const onDatePress = (date: Date) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(date);
  };

  const onMonthPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMonth(currentDate);
  };

  const getDayStatus = (date: Date): { color: string; hasRecords: boolean } => {
  const dateStr = formatDateFn(date, 'yyyy-MM-dd');
  const dayRecords = getRecordsForDate(dateStr);

    if (dayRecords.length === 0) {
      return { color: 'transparent', hasRecords: false };
    }

    const attended = dayRecords.filter(r => r.status === 'present').length;
    const total = dayRecords.length;
    const percentage = (attended / total) * 100;

    if (percentage === 100) {
      return { color: AppColors.success, hasRecords: true };
    } else if (percentage >= 50) {
      return { color: AppColors.warning, hasRecords: true };
    } else {
      return { color: AppColors.danger, hasRecords: true };
    }
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getMonthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    let totalClasses = 0;
    let attendedClasses = 0;

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
  const dateStr = formatDateFn(date, 'yyyy-MM-dd');
  const dayRecords = getRecordsForDate(dateStr);

      totalClasses += dayRecords.length;
      attendedClasses += dayRecords.filter(r => r.status === 'present').length;
    }

    const percentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

    return { totalClasses, attendedClasses, percentage };
  }, [currentDate, getRecordsForDate]);

  // Data preparation for day details
  const getDayData = useMemo(() => {
    if (!selectedDate) return null;
  const dateStr = formatDateFn(selectedDate, 'yyyy-MM-dd');
  const dayRecords = getRecordsForDate(dateStr);
    const subjectMap = new Map();

    // Group by subject
    subjects.forEach(subject => {
      const subjectRecords = dayRecords.filter(r => r.subjectId === subject.id && r.status !== 'no-lecture');
      const totalLectures = subjectRecords.length;
      const attendedLectures = subjectRecords.filter(r => r.status === 'present').length;

      if (totalLectures > 0) {
        subjectMap.set(subject.id, {
          name: subject.name,
          totalLectures,
          attendedLectures,
        });
      }
    });

    return Array.from(subjectMap.values());
  }, [selectedDate, getRecordsForDate, subjects]);

  // Data preparation for month details
  const getMonthData = useMemo(() => {
    if (!selectedMonth) return null;
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const subjectMap = new Map();

    // Initialize with all subjects
    subjects.forEach(subject => {
      subjectMap.set(subject.id, {
        name: subject.name,
        totalLectures: 0,
        attendedLectures: 0,
      });
    });

    // Process all dates in the month
    const lastDay = new Date(year, month + 1, 0);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
  const dateStr = formatDateFn(date, 'yyyy-MM-dd');
  const dayRecords = getRecordsForDate(dateStr);

      dayRecords.filter(r => r.status !== 'no-lecture').forEach(record => {
        const existing = subjectMap.get(record.subjectId);
        if (existing) {
          existing.totalLectures += 1;
          if (record.status === 'present') {
            existing.attendedLectures += 1;
          }
        }
      });
    }

    // Filter out subjects with no lectures
    return Array.from(subjectMap.values()).filter(data => data.totalLectures > 0);
  }, [selectedMonth, getRecordsForDate, subjects]);

  const closeModals = () => {
    setSelectedDate(null);
    setSelectedMonth(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>View your attendance calendar</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>This Month</Text>
          <Text style={styles.statsPercentage}>
            {getMonthStats.percentage.toFixed(1)}%
          </Text>
          <Text style={styles.statsText}>
            {getMonthStats.attendedClasses} / {getMonthStats.totalClasses} classes attended
          </Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={previousMonth} style={[styles.navButton, styles.navButtonLarge]}>
              <ChevronLeft color={theme.colors.primary} size={32} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onMonthPress}>
              <Text style={styles.monthTitle}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={[styles.navButton, styles.navButtonLarge]}>
              <ChevronRight color={theme.colors.primary} size={32} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {DAYS.map((day) => (
              <View key={day} style={styles.weekDay}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((date, index) => {
              const status = getDayStatus(date);
              const currentMonth = isCurrentMonth(date);
              const today = isToday(date);

              return (
                <View key={index} style={styles.dayCell}>
                  <TouchableOpacity
                    onPress={() => currentMonth && onDatePress(date)}
                    style={[
                      styles.dayContent,
                      status.hasRecords && { backgroundColor: status.color },
                      today && styles.todayBorder,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !currentMonth && styles.dayTextInactive,
                        status.hasRecords && styles.dayTextActive,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AppColors.success }]} />
              <Text style={styles.legendText}>100% Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AppColors.warning }]} />
              <Text style={styles.legendText}>Partial</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: AppColors.danger }]} />
              <Text style={styles.legendText}>Mostly Absent</Text>
            </View>
          </View>
        </View>

        {subjects.length === 0 && (
          <View style={styles.emptyState}>
            <CalendarIcon color={AppColors.gray[400]} size={48} />
            <Text style={styles.emptyStateTitle}>No data yet</Text>
            <Text style={styles.emptyStateText}>
              Add subjects and mark attendance to see your history
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Day Details Modal */}
      <Modal visible={!!selectedDate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModals}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedDate ? selectedDate.toLocaleDateString() : ''}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {getDayData && getDayData.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {getDayData.map((item, index) => (
                  <View key={index} style={styles.subjectCard}>
                    <View style={styles.subjectHeader}>
                      <BookOpen size={20} color={theme.colors.primary} />
                      <Text style={styles.subjectName}>{item.name}</Text>
                    </View>
                    <View style={styles.subjectStats}>
                      <Text style={styles.statText}>Lectures: {item.totalLectures}</Text>
                      <Text style={styles.statText}>Attended: {item.attendedLectures}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyModal}>
                <Text style={styles.emptyModalText}>No lectures on this day</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Month Details Modal */}
      <Modal visible={!!selectedMonth} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModals}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedMonth ? `${MONTHS[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}` : ''}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {getMonthData && getMonthData.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {getMonthData.map((item, index) => (
                  <View key={index} style={styles.subjectCard}>
                    <View style={styles.subjectHeader}>
                      <BookOpen size={20} color={theme.colors.primary} />
                      <Text style={styles.subjectName}>{item.name}</Text>
                    </View>
                    <View style={styles.subjectStats}>
                      <Text style={styles.statText}>Total Lectures: {item.totalLectures}</Text>
                      <Text style={styles.statText}>Total Attended: {item.attendedLectures}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyModal}>
                <Text style={styles.emptyModalText}>No lectures this month</Text>
              </View>
            )}
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
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  statsPercentage: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: theme.colors.white,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: theme.colors.white,
    opacity: 0.9,
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.gray[200],
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  weekDays: {
    flexDirection: 'row' as const,
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayContent: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  dayTextInactive: {
    color: theme.colors.gray[400],
  },
  dayTextActive: {
    color: theme.colors.white,
    fontWeight: '700' as const,
  },
  legend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    paddingHorizontal: 20,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subjectCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subjectStats: {
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  emptyModal: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  navButtonLarge: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
  },
});
