import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Subject, AttendanceRecord, DayRecord, AttendanceStats, LectureEntry } from '@/types/Attendance';
import { useLoading } from './LoadingContext';
import { handleError, createAsyncHandler } from '@/utils/errorHandler';

const STORAGE_KEYS = {
  SUBJECTS: '@attendance_subjects',
  RECORDS: '@attendance_records',
  DAYS: '@attendance_days',
  TARGET: '@attendance_target',
};

const AttendanceProviderInner = () => {
  const { setLoading } = useLoading();
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
      // Try to load from AsyncStorage
      const [subjectsData, recordsData, daysData, targetData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.RECORDS),
        AsyncStorage.getItem(STORAGE_KEYS.DAYS),
        AsyncStorage.getItem(STORAGE_KEYS.TARGET),
      ]);

      if (subjectsData) {
        const subjectsList = JSON.parse(subjectsData);
        setSubjects(subjectsList);
      }
      if (recordsData) {
        const recordsList = JSON.parse(recordsData);
        // Migrate old records with attended boolean to status and lectureIndex
        const migratedRecords = recordsList.map((r: any) => {
          if (r.attended !== undefined) {
            return { ...r, status: r.attended ? 'present' : 'absent', lectureIndex: 1, attended: undefined };
          }
          return { ...r, lectureIndex: r.lectureIndex || 1 };
        });
        setRecords(migratedRecords);
      }
      if (daysData) {
        const daysList = JSON.parse(daysData);
        setDays(daysList);
      }
      if (targetData) {
        setTargetPercentage(parseInt(targetData));
      }
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

  const addSubject = useCallback((name: string, color: string, targetPercentage: number = 75) => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name,
      code: '', // Keep empty for backward compatibility
      color,
      totalClasses: 0,
      attendedClasses: 0,
      targetPercentage,
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

  const markAttendance = useCallback((subjectId: string, date: string, status: 'present' | 'absent' | 'no-lecture', lectureIndex?: number) => {
    let newRecords: AttendanceRecord[];

    // Use the provided date directly for storage. UI should pass the date intended for the record.
    const targetDate = date;

    if (lectureIndex !== undefined) {
      // Target specific lecture
      const existingIndex = records.findIndex(
        r => r.subjectId === subjectId && r.date === targetDate && r.lectureIndex === lectureIndex
      );

      if (existingIndex >= 0) {
        newRecords = [...records];
        newRecords[existingIndex] = { ...newRecords[existingIndex], status };
      } else {
        // Add new lecture
        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          subjectId,
          date: targetDate,
          lectureIndex,
          status,
        };
        newRecords = [...records, newRecord];
      }
    } else {
      // Add new lecture with next index
      const subjectDateRecords = records.filter(r => r.subjectId === subjectId && r.date === targetDate);
      const maxIndex = subjectDateRecords.length > 0 ? Math.max(...subjectDateRecords.map(r => r.lectureIndex)) : 0;
      const newIndex = maxIndex + 1;
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        subjectId,
        date: targetDate,
        lectureIndex: newIndex,
        status,
      };
      newRecords = [...records, newRecord];
    }

    // Recalculate subject stats
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      const subjectRecords = newRecords.filter(r => r.subjectId === subjectId);
      const total = subjectRecords.filter(r => r.status !== 'no-lecture').length;
      const attendedCount = subjectRecords.filter(r => r.status === 'present').length;

      updateSubject(subjectId, {
        totalClasses: total,
        attendedClasses: attendedCount,
      });
    }

    saveRecords(newRecords);
  }, [records, subjects, updateSubject]);

  const markAllAttendance = useCallback((date: string, status: 'present' | 'absent') => {
    console.log('markAllAttendance called with date:', date, 'status:', status, 'subjects count:', subjects.length, 'subjects ids:', subjects.map(s => s.id));

    // Use provided date directly for storage (UI passes the date intended for the record)
    const adjustedDate = date;

    let newRecords = [...records];
    let newSubjects = [...subjects];

    // Subjects that need a new record added
    const subjectsToAdd = new Set(subjects.map(s => s.id));

    // Update all existing records for the adjusted date that are not 'no-lecture'
    newRecords.forEach((record, index) => {
      if (record.date === adjustedDate && record.status !== 'no-lecture') {
        newRecords[index] = { ...record, status };
        subjectsToAdd.delete(record.subjectId);
      }
    });

    // Add a first lecture for subjects that had no eligible records
    subjectsToAdd.forEach(subjectId => {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString() + Math.random(),
        subjectId,
        date: adjustedDate,
        lectureIndex: 1,
        status,
      };
      newRecords.push(newRecord);
    });

    // Recalculate all subjects stats
    subjects.forEach(subject => {
      const subjectRecords = newRecords.filter(r => r.subjectId === subject.id);
      const total = subjectRecords.filter(r => r.status !== 'no-lecture').length;
      const attendedCount = subjectRecords.filter(r => r.status === 'present').length;

      const subjectIndex = newSubjects.findIndex(s => s.id === subject.id);
      if (subjectIndex >= 0) {
        newSubjects[subjectIndex] = {
          ...newSubjects[subjectIndex],
          totalClasses: total,
          attendedClasses: attendedCount,
        };
      }
    });

    console.log('markAllAttendance completed, saving records and subjects');
    saveRecords(newRecords);
    saveSubjects(newSubjects);
  }, [subjects, records]);

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
    const subjectTarget = subject.targetPercentage || targetPercentage;
    
    const canMiss = Math.floor(
      (subject.attendedClasses - (subjectTarget / 100) * subject.totalClasses) /
      (subjectTarget / 100)
    );

    const needToAttend = Math.ceil(
      ((subjectTarget / 100) * subject.totalClasses - subject.attendedClasses) /
      (1 - subjectTarget / 100)
    );

    let status: 'safe' | 'warning' | 'danger';
    if (percentage >= subjectTarget) {
      status = 'safe' as const;
    } else if (percentage >= subjectTarget - 5) {
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

  const deleteLecture = useCallback((subjectId: string, date: string, lectureIndex: number) => {
    const newRecords = records.filter(
      r => !(r.subjectId === subjectId && r.date === date && r.lectureIndex === lectureIndex)
    );

    // Recalculate subject stats after deletion
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      const subjectRecords = newRecords.filter(r => r.subjectId === subjectId);
      const total = subjectRecords.filter(r => r.status !== 'no-lecture').length;
      const attendedCount = subjectRecords.filter(r => r.status === 'present').length;

      updateSubject(subjectId, {
        totalClasses: total,
        attendedClasses: attendedCount,
      });
    }

    saveRecords(newRecords);
  }, [records, subjects, updateSubject]);

  const saveDayAttendance = useCallback((date: string, entries: LectureEntry[]) => {
    let newRecords = records.filter(r => r.date !== date);
    let newSubjects = [...subjects];
    const subjectIdsToRecalculate = new Set<string>();

    // 1. Generate new AttendanceRecords from LectureEntry
    entries.forEach(entry => {
      subjectIdsToRecalculate.add(entry.subjectId);
      for (let i = 1; i <= entry.lectures; i++) {
        const status: 'present' | 'absent' = i <= entry.attended ? 'present' : 'absent';
        const newRecord: AttendanceRecord = {
          id: `${date}-${entry.subjectId}-${i}`, // Deterministic ID for a given date/subject/index
          subjectId: entry.subjectId,
          date,
          lectureIndex: i,
          status,
        };
        newRecords.push(newRecord);
      }
    });

    // 2. Recalculate stats for affected subjects
    subjectIdsToRecalculate.forEach(subjectId => {
      const subjectRecords = newRecords.filter(r => r.subjectId === subjectId);
      const total = subjectRecords.filter(r => r.status !== 'no-lecture').length;
      const attendedCount = subjectRecords.filter(r => r.status === 'present').length;

      const subjectIndex = newSubjects.findIndex(s => s.id === subjectId);
      if (subjectIndex >= 0) {
        newSubjects[subjectIndex] = {
          ...newSubjects[subjectIndex],
          totalClasses: total,
          attendedClasses: attendedCount,
        };
      }
    });

    // 3. Save all changes
    saveRecords(newRecords);
    saveSubjects(newSubjects);
  }, [records, subjects, saveRecords, saveSubjects]);

  const updateDayNotes = useCallback((date: string, notes: string) => {
    const existingIndex = days.findIndex(d => d.date === date);
    let newDays: DayRecord[];

    if (existingIndex >= 0) {
      newDays = [...days];
      newDays[existingIndex] = {
        ...newDays[existingIndex],
        notes,
      };
    } else {
      newDays = [...days, { date, isHoliday: false, notes }];
    }

    saveDays(newDays);
  }, [days]);

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
    updateDayNotes,
    deleteLecture,
    saveDayAttendance,
  }), [subjects, records, days, targetPercentage, isLoading, addSubject, updateSubject, deleteSubject, markAttendance, markAllAttendance, toggleHoliday, getSubjectStats, getOverallStats, updateTargetPercentage, isHoliday, getRecordsForDate, updateDayNotes, deleteLecture, saveDayAttendance]);
};

export const [AttendanceProvider, useAttendance] = createContextHook(AttendanceProviderInner);
