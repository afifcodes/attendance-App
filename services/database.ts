import * as SQLite from 'expo-sqlite';
import type { Subject, AttendanceRecord, DayRecord } from '@/types/Attendance';

const DB_NAME = 'attendance.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Create subjects table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        totalClasses INTEGER DEFAULT 0,
        attendedClasses INTEGER DEFAULT 0,
        targetPercentage INTEGER DEFAULT 75,
        createdAt TEXT NOT NULL
      );
    `);

    // Create attendance_records table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        subjectId TEXT NOT NULL,
        date TEXT NOT NULL,
        attended INTEGER NOT NULL,
        FOREIGN KEY (subjectId) REFERENCES subjects (id) ON DELETE CASCADE
      );
    `);

    // Create days table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS days (
        date TEXT PRIMARY KEY,
        isHoliday INTEGER DEFAULT 0,
        notes TEXT
      );
    `);

    // Create settings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  // Subjects
  async saveSubjects(subjects: Subject[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM subjects');
    
    for (const subject of subjects) {
      await this.db.runAsync(
        'INSERT INTO subjects (id, name, color, totalClasses, attendedClasses, targetPercentage, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [subject.id, subject.name, subject.color, subject.totalClasses, subject.attendedClasses, subject.targetPercentage, subject.createdAt]
      );
    }
  }

  async getSubjects(): Promise<Subject[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM subjects ORDER BY createdAt ASC'
    );
    
    return result.map(row => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      totalClasses: row.totalClasses as number,
      attendedClasses: row.attendedClasses as number,
      targetPercentage: row.targetPercentage as number,
      createdAt: row.createdAt as string,
    }));
  }

  // Attendance Records
  async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM attendance_records');
    
    for (const record of records) {
      await this.db.runAsync(
        'INSERT INTO attendance_records (id, subjectId, date, attended) VALUES (?, ?, ?, ?)',
        [record.id, record.subjectId, record.date, record.attended ? 1 : 0]
      );
    }
  }

  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM attendance_records ORDER BY date DESC'
    );
    
    return result.map(row => ({
      id: row.id as string,
      subjectId: row.subjectId as string,
      date: row.date as string,
      attended: (row.attended as number) === 1,
    }));
  }

  // Days
  async saveDays(days: DayRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM days');
    
    for (const day of days) {
      await this.db.runAsync(
        'INSERT INTO days (date, isHoliday, notes) VALUES (?, ?, ?)',
        [day.date, day.isHoliday ? 1 : 0, day.notes || null]
      );
    }
  }

  async getDays(): Promise<DayRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM days ORDER BY date DESC'
    );
    
    return result.map(row => ({
      date: row.date as string,
      isHoliday: (row.isHoliday as number) === 1,
      notes: row.notes as string | undefined,
    }));
  }

  // Settings
  async saveSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    
    return result ? (result.value as string) : null;
  }

  // Backup and Restore
  async exportData(): Promise<{
    subjects: Subject[];
    records: AttendanceRecord[];
    days: DayRecord[];
    settings: Record<string, string>;
  }> {
    const [subjects, records, days] = await Promise.all([
      this.getSubjects(),
      this.getAttendanceRecords(),
      this.getDays(),
    ]);

    // Get all settings
    const settingsResult = await this.db!.getAllAsync('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    settingsResult.forEach(row => {
      settings[row.key as string] = row.value as string;
    });

    return { subjects, records, days, settings };
  }

  async importData(data: {
    subjects: Subject[];
    records: AttendanceRecord[];
    days: DayRecord[];
    settings: Record<string, string>;
  }): Promise<void> {
    await Promise.all([
      this.saveSubjects(data.subjects),
      this.saveAttendanceRecords(data.records),
      this.saveDays(data.days),
    ]);

    // Save settings
    for (const [key, value] of Object.entries(data.settings)) {
      await this.saveSetting(key, value);
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await Promise.all([
      this.db.runAsync('DELETE FROM subjects'),
      this.db.runAsync('DELETE FROM attendance_records'),
      this.db.runAsync('DELETE FROM days'),
      this.db.runAsync('DELETE FROM settings'),
    ]);
  }
}

export const databaseService = new DatabaseService();
