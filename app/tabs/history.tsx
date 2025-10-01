import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAttendance } from '@/contexts/AttendanceContext';
import { AppColors } from '@/constants/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { subjects, getRecordsForDate } = useAttendance();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

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

  const getDayStatus = (date: Date): { color: string; hasRecords: boolean } => {
    const dateStr = date.toISOString().split('T')[0];
    const dayRecords = getRecordsForDate(dateStr);

    if (dayRecords.length === 0) {
      return { color: 'transparent', hasRecords: false };
    }

    const attended = dayRecords.filter(r => r.attended).length;
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
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = getRecordsForDate(dateStr);

      totalClasses += dayRecords.length;
      attendedClasses += dayRecords.filter(r => r.attended).length;
    }

    const percentage = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;

    return { totalClasses, attendedClasses, percentage };
  }, [currentDate, getRecordsForDate]);

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
            <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft color={AppColors.gray[700]} size={24} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <ChevronRight color={AppColors.gray[700]} size={24} />
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
                  <View
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
                  </View>
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
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppColors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  statsPercentage: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: AppColors.white,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: AppColors.white,
    opacity: 0.9,
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: AppColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
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
    backgroundColor: AppColors.gray[100],
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: AppColors.gray[900],
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
    color: AppColors.gray[600],
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
    borderColor: AppColors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: AppColors.gray[900],
  },
  dayTextInactive: {
    color: AppColors.gray[400],
  },
  dayTextActive: {
    color: AppColors.white,
    fontWeight: '700' as const,
  },
  legend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: AppColors.gray[200],
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
    color: AppColors.gray[600],
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
    color: AppColors.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: AppColors.gray[600],
    textAlign: 'center' as const,
  },
});
