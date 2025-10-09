export interface Subject {
  id: string;
  name: string;
  code: string; // Unique subject code
  color: string;
  totalClasses: number;
  attendedClasses: number;
  targetPercentage: number; // Individual target per subject
  createdAt: string;
}

export interface AttendanceRecord {
id: string;
subjectId: string;
date: string;
lectureIndex: number; // 1, 2, 3 for multiple lectures on the same day
status: 'present' | 'absent' | 'no-lecture';
}

export interface DayRecord {
  date: string;
  isHoliday: boolean;
  notes?: string; // Optional notes for absent days
}

export interface AttendanceStats {
percentage: number;
attended: number;
total: number;
canMiss: number;
needToAttend: number;
status: 'safe' | 'warning' | 'danger';
}
