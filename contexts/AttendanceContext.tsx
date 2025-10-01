import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Subject, AttendanceRecord, DayRecord, AttendanceStats } from '@/types/attendance';

const STORAGE_KEYS = {
  SUBJECTS: '@attendance_subjects',
  RECORDS: '@attendance_records',
  DAYS: '@attendance_days',
  TARGET: '@attendance_target',
};

export const [AttendanceProvider, useAttendance] = createContextHook(() => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [days, setDays] = useState<DayRecord[]>([]);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subjectsData, recordsData, daysData, targetData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.RECORDS),
        AsyncStorage.getItem(STORAGE_KEYS.DAYS),
        AsyncStorage.getItem(STORAGE_KEYS.TARGET),
      ]);

      if (subjectsData) setSubjects(JSON.parse(subjectsData));
      if (recordsData) setRecords(JSON.parse(recordsData));
      if (daysData) setDays(JSON.parse(daysData));
      if (targetData) setTargetPercentage(JSON.parse(targetData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubjects = async (newSubjects: Subject[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(newSubjects));
      setSubjects(newSubjects);
    } catch (error) {
      console.error('Error saving subjects:', error);
    }
  };

  const saveRecords = async (newRecords: AttendanceRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(newRecords));
      setRecords(newRecords);
    } catch (error) {
      console.error('Error saving records:', error);
    }
  };

  const saveDays = async (newDays: DayRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(newDays));
      setDays(newDays);
    } catch (error) {
      console.error('Error saving days:', error);
    }
  };

  const addSubject = useCallback((name: string, color: string) => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name,
      color,
      totalClasses: 0,
      attendedClasses: 0,
      createdAt: new Date().toISOString(),
    };
    saveSubjects([...subjects, newSubject]);
  }, [subjects]);

  const updateSubject = useCallback((id: string, updates: Partial<Subject>) => {
    const updated = subjects.map(s => s.id === id ? { ...s, ...updates } : s);
    saveSubjects(updated);
  }, [subjects]);

  const deleteSubject = useCallback((id: string) => {
    const filtered = subjects.filter(s => s.id !== id);
    const filteredRecords = records.filter(r => r.subjectId !== id);
    saveSubjects(filtered);
    saveRecords(filteredRecords);
  }, [subjects, records]);

  const markAttendance = useCallback((subjectId: string, date: string, attended: boolean) => {
    const existingIndex = records.findIndex(
      r => r.subjectId === subjectId && r.date === date
    );

    let newRecords: AttendanceRecord[];
    if (existingIndex >= 0) {
      newRecords = [...records];
      newRecords[existingIndex] = { ...newRecords[existingIndex], attended };
    } else {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        subjectId,
        date,
        attended,
      };
      newRecords = [...records, newRecord];
    }

    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      const subjectRecords = newRecords.filter(r => r.subjectId === subjectId);
      const total = subjectRecords.length;
      const attended = subjectRecords.filter(r => r.attended).length;
      
      updateSubject(subjectId, {
        totalClasses: total,
        attendedClasses: attended,
      });
    }

    saveRecords(newRecords);
  }, [records, subjects, updateSubject]);

  const markAllAttendance = useCallback((date: string, attended: boolean) => {
    subjects.forEach(subject => {
      markAttendance(subject.id, date, attended);
    });
  }, [subjects, markAttendance]);

  const toggleHoliday = useCallback((date: string) => {
    const existingIndex = days.findIndex(d => d.date === date);
    let newDays: DayRecord[];

    if (existingIndex >= 0) {
      newDays = [...days];
      newDays[existingIndex] = {
        ...newDays[existingIndex],
        isHoliday: !newDays[existingIndex].isHoliday,
      };
    } else {
      newDays = [...days, { date, isHoliday: true }];
    }

    saveDays(newDays);
  }, [days]);

  const getSubjectStats = useCallback((subjectId: string): AttendanceStats => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject || subject.totalClasses === 0) {
      return {
        percentage: 0,
        attended: 0,
        total: 0,
        canMiss: 0,
        needToAttend: 0,
        status: 'safe' as const,
      };
    }

    const percentage = (subject.attendedClasses / subject.totalClasses) * 100;
    
    const canMiss = Math.floor(
      (subject.attendedClasses - (targetPercentage / 100) * subject.totalClasses) /
      (targetPercentage / 100)
    );

    const needToAttend = Math.ceil(
      ((targetPercentage / 100) * subject.totalClasses - subject.attendedClasses) /
      (1 - targetPercentage / 100)
    );

    let status: 'safe' | 'warning' | 'danger';
    if (percentage >= targetPercentage) {
      status = 'safe' as const;
    } else if (percentage >= targetPercentage - 5) {
      status = 'warning' as const;
    } else {
      status = 'danger' as const;
    }

    return {
      percentage,
      attended: subject.attendedClasses,
      total: subject.totalClasses,
      canMiss: Math.max(0, canMiss),
      needToAttend: Math.max(0, needToAttend),
      status,
    };
  }, [subjects, targetPercentage]);

  const getOverallStats = useCallback((): AttendanceStats => {
    if (subjects.length === 0) {
      return {
        percentage: 0,
        attended: 0,
        total: 0,
        canMiss: 0,
        needToAttend: 0,
        status: 'safe' as const,
      };
    }

    const totalAttended = subjects.reduce((sum, s) => sum + s.attendedClasses, 0);
    const totalClasses = subjects.reduce((sum, s) => sum + s.totalClasses, 0);

    if (totalClasses === 0) {
      return {
        percentage: 0,
        attended: 0,
        total: 0,
        canMiss: 0,
        needToAttend: 0,
        status: 'safe' as const,
      };
    }

    const percentage = (totalAttended / totalClasses) * 100;

    const canMiss = Math.floor(
      (totalAttended - (targetPercentage / 100) * totalClasses) /
      (targetPercentage / 100)
    );

    const needToAttend = Math.ceil(
      ((targetPercentage / 100) * totalClasses - totalAttended) /
      (1 - targetPercentage / 100)
    );

    let status: 'safe' | 'warning' | 'danger';
    if (percentage >= targetPercentage) {
      status = 'safe' as const;
    } else if (percentage >= targetPercentage - 5) {
      status = 'warning' as const;
    } else {
      status = 'danger' as const;
    }

    return {
      percentage,
      attended: totalAttended,
      total: totalClasses,
      canMiss: Math.max(0, canMiss),
      needToAttend: Math.max(0, needToAttend),
      status,
    };
  }, [subjects, targetPercentage]);

  const updateTargetPercentage = useCallback(async (newTarget: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TARGET, JSON.stringify(newTarget));
      setTargetPercentage(newTarget);
    } catch (error) {
      console.error('Error updating target:', error);
    }
  }, []);

  const isHoliday = useCallback((date: string): boolean => {
    const day = days.find(d => d.date === date);
    return day?.isHoliday || false;
  }, [days]);

  const getRecordsForDate = useCallback((date: string): AttendanceRecord[] => {
    return records.filter(r => r.date === date);
  }, [records]);

  return useMemo(() => ({
    subjects,
    records,
    days,
    targetPercentage,
    isLoading,
    addSubject,
    updateSubject,
    deleteSubject,
    markAttendance,
    markAllAttendance,
    toggleHoliday,
    getSubjectStats,
    getOverallStats,
    updateTargetPercentage,
    isHoliday,
    getRecordsForDate,
  }), [subjects, records, days, targetPercentage, isLoading, addSubject, updateSubject, deleteSubject, markAttendance, markAllAttendance, toggleHoliday, getSubjectStats, getOverallStats, updateTargetPercentage, isHoliday, getRecordsForDate]);
});
