import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Subject, AttendanceRecord, DayRecord, AttendanceStats, LectureEntry } from '@/types/Attendance';
import { useLoading } from './LoadingContext';
import { handleError, createAsyncHandler } from '@/utils/errorHandler';
import { authService } from '@/services/auth';
import {
  saveDayAttendanceToCloud,
  getDayAttendanceFromCloud,
  migrateLocalToCloud,
  listAllAttendanceDays,
} from '@/services/firestore';
import useToast from '@/utils/useToast';

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

  // Handle actions when a user logs in: hydrate app state from cloud
  const handleUserLogin = useCallback(async (uid: string) => {
    try {
      // Hydrate app state from cloud: list all attendance days and reconstruct records/subjects
      const docs = await listAllAttendanceDays(uid);
      const newRecords: AttendanceRecord[] = [];
      const subjectMap: Record<string, any> = {};

      for (const doc of docs) {
        const date = doc.id;
        const data = doc.entries as Array<any>;
        if (!Array.isArray(data)) continue;
        for (const e of data) {
          const sid = e.subjectId || e.subject || String(e.subject);
          subjectMap[sid] = subjectMap[sid] || { id: sid, name: e.subject || sid, color: '#888', totalClasses: 0, attendedClasses: 0, targetPercentage: 75, createdAt: new Date().toISOString() };
          const lectures = e.lectures || 0;
          const attended = e.attended || 0;
          for (let i = 1; i <= lectures; i++) {
            const status: 'present' | 'absent' = i <= attended ? 'present' : 'absent';
            newRecords.push({
              id: `${date}-${sid}-${i}`,
              subjectId: sid,
              date,
              lectureIndex: i,
              status,
            });
          }
          // update subject counters
          subjectMap[sid].totalClasses += lectures;
          subjectMap[sid].attendedClasses += attended;
        }
      }

      const newSubjects = Object.values(subjectMap) as Subject[];
      // Reverse rehydration guard: if local data exists, don't overwrite it with cloud data
      const localRecordsExist = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
      const localSubjectsExist = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (localRecordsExist || localSubjectsExist) {
        // Keep local data to avoid accidental overwrite
        toast.show('Local attendance data detected — retained local copy. Cloud data was not applied to avoid overwrite.', 'info', 4000);
      } else {
        // Save locally so AttendanceContext loads them normally
        if (newSubjects.length > 0) await saveSubjects(newSubjects);
        if (newRecords.length > 0) await saveRecords(newRecords);
        toast.show('Attendance data loaded from cloud', 'success', 2500);
      }
    } catch (err) {
      console.error('Error handling user login sync:', err);
    }
  }, [saveSubjects, saveRecords]);

  // Subscribe to auth state changes to handle login/logout sync
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          // On login: migrate local -> cloud if local data exists, then hydrate from cloud
          await handleUserLogin(user.uid);
        } else {
          // On logout: clear local cache but keep cloud data
          await clearLocalCache();
        }
      } catch (e) {
        console.error('Auth state handler error:', e);
      }
    });

    return () => {
      unsubscribe && unsubscribe();
    };
  }, [handleUserLogin, clearLocalCache]);
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

  // Helper: clear AsyncStorage local cache and reset in-memory state
  const clearLocalCache = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.SUBJECTS),
        AsyncStorage.removeItem(STORAGE_KEYS.RECORDS),
        AsyncStorage.removeItem(STORAGE_KEYS.DAYS),
        AsyncStorage.removeItem(STORAGE_KEYS.TARGET),
      ]);
    } catch (err) {
      console.error('Error clearing local cache:', err);
    } finally {
      setSubjects([]);
      setRecords([]);
      setDays([]);
      setTargetPercentage(75);
    }
  }, []);

  const toast = useToast();

  // Helper: build DayEntry[] from current records for a date and send to Firestore
  const syncDayToCloud = useCallback(async (date: string) => {
    try {
      const currentUser = authService.getCurrentUser();
      const uid = currentUser?.uid;
      if (!uid) return;

      // Build map subjectId -> { lectures, attended, subjectName }
      const rows = records.filter(r => r.date === date && r.status !== 'no-lecture');
      const map: Record<string, { lectures: number; attended: number; subjectName?: string }> = {};
      rows.forEach(r => {
        const id = r.subjectId;
        if (!map[id]) map[id] = { lectures: 0, attended: 0, subjectName: '' };
        if (r.lectureIndex > map[id].lectures) map[id].lectures = r.lectureIndex;
        if (r.status === 'present') map[id].attended += 1;
      });

      const entries = Object.entries(map).map(([subjectId, v]) => ({
        subject: subjects.find(s => s.id === subjectId)?.name || v.subjectName || subjectId,
        subjectId,
        lectures: v.lectures,
        attended: v.attended,
      }));

      if (entries.length > 0) {
        try {
          await saveDayAttendanceToCloud(uid, date, entries as any);
          // show a small success toast
          toast.show(`Synced ${date} to cloud`, 'success', 2000);
        } catch (err) {
          console.error('Error saving day to cloud:', err);
          toast.show('Failed to sync to cloud', 'error', 3000);
        }
      }
    } catch (err) {
      console.error('Error syncing day to cloud:', err);
    }
  }, [records, subjects]);

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
