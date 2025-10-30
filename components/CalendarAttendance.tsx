import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { useTheme } from '@/contexts/ThemeContext';
import { useAttendance } from '@/contexts/AttendanceContext';
import { AttendanceRecord } from '@/types/Attendance';
import { format } from 'date-fns';
import MarkPastAttendanceModal from './MarkPastAttendanceModal';

// Configure locale for react-native-calendars (optional, but good practice)
LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

interface CalendarAttendanceProps {
  onDaySelected?: (isoDate: string) => void;
}

const CalendarAttendance: React.FC<CalendarAttendanceProps> = ({ onDaySelected }) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { records, subjects } = useAttendance();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // Date in 'YYYY-MM-DD' format

  const handleDayPress = (day: DateData) => {
    // Format date to 'YYYY-MM-DD' (ISO) for context/storage
    const isoDate = format(new Date(day.timestamp), 'yyyy-MM-dd');
    if (onDaySelected) {
      // Let parent handle navigation/opening modal for selected date
      onDaySelected(isoDate);
      return;
    }

    // Fallback: open internal modal using ISO date
    setSelectedDate(isoDate);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedDate(null);
  };

  // Memoize marked dates for performance
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};
    
    // Group records by date
    const recordsByDate = records.reduce((acc, record) => {
      // Convert 'DD-MM-YYYY' to 'YYYY-MM-DD' for react-native-calendars
      const [day, month, year] = record.date.split('-');
      const calendarDate = `${year}-${month}-${day}`;

      if (!acc[calendarDate]) {
        acc[calendarDate] = [];
      }
      acc[calendarDate].push(record);
      return acc;
    }, {} as { [key: string]: AttendanceRecord[] });

    // Determine marking for each date
    Object.keys(recordsByDate).forEach(calendarDate => {
      const dayRecords = recordsByDate[calendarDate];
      const totalLectures = dayRecords.filter(r => r.status !== 'no-lecture').length;
      const attendedLectures = dayRecords.filter(r => r.status === 'present').length;

      let dotColor = colors.textSecondary; // Default for mixed/some attendance
      if (totalLectures > 0) {
        if (attendedLectures === totalLectures) {
          dotColor = colors.success; // All present
        } else if (attendedLectures === 0) {
          dotColor = colors.danger; // All absent
        }
      }

      marked[calendarDate] = {
        dotColor: dotColor,
        marked: true,
        // You can add more properties like selected, disabled, etc.
      };
    });

    return marked;
  }, [records, colors]);

  const calendarTheme = useMemo(() => ({
    backgroundColor: colors.background,
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textSecondary,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: colors.white,
    todayTextColor: colors.primary,
    dayTextColor: colors.text,
    textDisabledColor: colors.textSecondary,
    dotColor: colors.primary,
    selectedDotColor: colors.white,
    arrowColor: colors.primary,
    monthTextColor: colors.text,
    textDayFontWeight: '300' as '300',
    textMonthFontWeight: 'bold' as 'bold',
    textDayHeaderFontWeight: '300' as '300',
    textDayFontSize: 16,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 16,
  }), [colors]);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType={'dot'}
        theme={calendarTheme}
      />
      <MarkPastAttendanceModal
        isVisible={isModalVisible}
        date={selectedDate}
        onClose={handleModalClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default CalendarAttendance;