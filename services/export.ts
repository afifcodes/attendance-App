import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import type { Subject, AttendanceRecord, DayRecord } from '@/types/Attendance';

export interface ExportOptions {
  includeSubjects: boolean;
  includeRecords: boolean;
  includeCalendar: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

class ExportService {
  private static instance: ExportService;

  private constructor() {}

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  // Generate PDF Report
  async generatePDFReport(
    subjects: Subject[],
    records: AttendanceRecord[],
    days: DayRecord[],
    options: ExportOptions = {
      includeSubjects: true,
      includeRecords: true,
      includeCalendar: true,
    }
  ): Promise<string | null> {
    try {
      const html = this.generateHTMLReport(subjects, records, days, options);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  }

  // Generate CSV Report
  async generateCSVReport(
    subjects: Subject[],
    records: AttendanceRecord[],
    options: ExportOptions = {
      includeSubjects: true,
      includeRecords: true,
      includeCalendar: false,
    }
  ): Promise<string | null> {
    try {
      let csvContent = '';
      
      if (options.includeSubjects) {
        csvContent += this.generateSubjectsCSV(subjects);
        csvContent += '\n\n';
      }
      
      if (options.includeRecords) {
        csvContent += this.generateRecordsCSV(records, subjects);
      }

      const fileName = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return fileUri;
    } catch (error) {
      console.error('Error generating CSV:', error);
      return null;
    }
  }

  // Share file
  async shareFile(fileUri: string, fileName: string): Promise<boolean> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
          dialogTitle: 'Share Attendance Report',
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sharing file:', error);
      return false;
    }
  }

  // Generate HTML for PDF
  private generateHTMLReport(
    subjects: Subject[],
    records: AttendanceRecord[],
    days: DayRecord[],
    options: ExportOptions
  ): string {
    const currentDate = new Date().toLocaleDateString();
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Attendance Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563EB;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #2563EB;
            margin: 0;
          }
          .header p {
            color: #6B7280;
            margin: 5px 0;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #374151;
            border-left: 4px solid #2563EB;
            padding-left: 15px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #E5E7EB;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #F3F4F6;
            font-weight: 600;
            color: #374151;
          }
          .percentage {
            font-weight: 600;
          }
          .safe { color: #10B981; }
          .warning { color: #F59E0B; }
          .danger { color: #EF4444; }
          .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-safe { background-color: #D1FAE5; color: #065F46; }
          .status-warning { background-color: #FEF3C7; color: #92400E; }
          .status-danger { background-color: #FEE2E2; color: #991B1B; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance Report</h1>
          <p>Generated on ${currentDate}</p>
        </div>
    `;

    if (options.includeSubjects) {
      html += this.generateSubjectsHTML(subjects);
    }

    if (options.includeRecords) {
      html += this.generateRecordsHTML(records, subjects);
    }

    if (options.includeCalendar) {
      html += this.generateCalendarHTML(days, records, subjects);
    }

    html += `
      </body>
      </html>
    `;

    return html;
  }

  private generateSubjectsHTML(subjects: Subject[]): string {
    let html = `
      <div class="section">
        <h2>Subject Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Target %</th>
              <th>Current %</th>
              <th>Attended</th>
              <th>Total</th>
              <th>Status</th>
              <th>Can Miss</th>
              <th>Need to Attend</th>
            </tr>
          </thead>
          <tbody>
    `;

    subjects.forEach(subject => {
      const percentage = subject.totalClasses > 0 ? (subject.attendedClasses / subject.totalClasses) * 100 : 0;
      const status = percentage >= subject.targetPercentage ? 'safe' : 
                     percentage >= subject.targetPercentage - 5 ? 'warning' : 'danger';
      
      const canMiss = Math.floor(
        (subject.attendedClasses - (subject.targetPercentage / 100) * subject.totalClasses) /
        (subject.targetPercentage / 100)
      );

      const needToAttend = Math.ceil(
        ((subject.targetPercentage / 100) * subject.totalClasses - subject.attendedClasses) /
        (1 - subject.targetPercentage / 100)
      );

      html += `
        <tr>
          <td style="color: ${subject.color}; font-weight: 600;">${subject.name}</td>
          <td>${subject.targetPercentage}%</td>
          <td class="percentage ${status}">${percentage.toFixed(1)}%</td>
          <td>${subject.attendedClasses}</td>
          <td>${subject.totalClasses}</td>
          <td><span class="status-badge status-${status}">${status.toUpperCase()}</span></td>
          <td>${Math.max(0, canMiss)}</td>
          <td>${Math.max(0, needToAttend)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  private generateRecordsHTML(records: AttendanceRecord[], subjects: Subject[]): string {
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    
    let html = `
      <div class="section">
        <h2>Attendance Records</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Subject</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Group records by date
    const recordsByDate = new Map<string, AttendanceRecord[]>();
    records.forEach(record => {
      if (!recordsByDate.has(record.date)) {
        recordsByDate.set(record.date, []);
      }
      recordsByDate.get(record.date)!.push(record);
    });

    // Sort dates
    const sortedDates = Array.from(recordsByDate.keys()).sort();

    sortedDates.forEach(date => {
      const dayRecords = recordsByDate.get(date)!;
      dayRecords.forEach(record => {
        const subject = subjectMap.get(record.subjectId);
        html += `
          <tr>
            <td>${new Date(date).toLocaleDateString()}</td>
            <td style="color: ${subject?.color || '#000'};">${subject?.name || 'Unknown Subject'}</td>
            <td><span class="status-badge ${record.attended ? 'status-safe' : 'status-danger'}">
              ${record.attended ? 'PRESENT' : 'ABSENT'}
            </span></td>
          </tr>
        `;
      });
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  private generateCalendarHTML(days: DayRecord[], records: AttendanceRecord[], subjects: Subject[]): string {
    // This is a simplified calendar view
    // In a real implementation, you might want to generate a full calendar grid
    return `
      <div class="section">
        <h2>Calendar Notes</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${days.filter(day => day.notes).map(day => `
              <tr>
                <td>${new Date(day.date).toLocaleDateString()}</td>
                <td>${day.notes}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private generateSubjectsCSV(subjects: Subject[]): string {
    let csv = 'Subject Name,Target %,Current %,Attended,Total,Status,Can Miss,Need to Attend\n';
    
    subjects.forEach(subject => {
      const percentage = subject.totalClasses > 0 ? (subject.attendedClasses / subject.totalClasses) * 100 : 0;
      const status = percentage >= subject.targetPercentage ? 'SAFE' : 
                     percentage >= subject.targetPercentage - 5 ? 'WARNING' : 'DANGER';
      
      const canMiss = Math.floor(
        (subject.attendedClasses - (subject.targetPercentage / 100) * subject.totalClasses) /
        (subject.targetPercentage / 100)
      );

      const needToAttend = Math.ceil(
        ((subject.targetPercentage / 100) * subject.totalClasses - subject.attendedClasses) /
        (1 - subject.targetPercentage / 100)
      );

      csv += `"${subject.name}",${subject.targetPercentage},${percentage.toFixed(1)},${subject.attendedClasses},${subject.totalClasses},${status},${Math.max(0, canMiss)},${Math.max(0, needToAttend)}\n`;
    });

    return csv;
  }

  private generateRecordsCSV(records: AttendanceRecord[], subjects: Subject[]): string {
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    
    let csv = 'Date,Subject,Status\n';
    
    // Sort records by date
    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedRecords.forEach(record => {
      const subject = subjectMap.get(record.subjectId);
      csv += `"${new Date(record.date).toLocaleDateString()}","${subject?.name || 'Unknown Subject'}","${record.attended ? 'PRESENT' : 'ABSENT'}"\n`;
    });

    return csv;
  }
}

export const exportService = ExportService.getInstance();
