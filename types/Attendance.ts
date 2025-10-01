export interface Subject {
  id: string;
  name: string;
  color: string;
  totalClasses: number;
  attendedClasses: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string;
  attended: boolean;
}

export interface DayRecord {
  date: string;
  isHoliday: boolean;
}

export interface AttendanceStats {
  percentage: number;
  attended: number;
  total: number;
  canMiss: number;
  needToAttend: number;
  status: 'safe' | 'warning' | 'danger';
}
