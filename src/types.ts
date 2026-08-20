export interface Student {
  id: number;
  code: string; // "01", "02", etc.
  name: string; // The primary display name (e.g., "叶文轩", "Jiang Anqi")
  pinyinOrEn?: string; // Pinyin / English romanization
  chineseName?: string; // Chinese character equivalent if known
  isNew?: boolean;
  phoneStored?: boolean; // Temporary live storage status in box
  notes?: string;
}

export type DisplayMode = 'original' | 'standard' | 'numbered';

export type TimeSlotId = 'morning' | 'noon' | 'evening' | 'custom';

export interface TimeSlotConfig {
  id: TimeSlotId;
  name: string;
  time: string; // e.g. "08:55"
  periodName: string; // "早自习"
  color: string;
  icon: string;
}

export interface StudentUnsubmittedRef {
  id: number;
  code: string;
  name: string;
}

export interface InspectionRecord {
  id: string; // timestamp or uuid
  date: string; // "YYYY-MM-DD"
  timeSlot: TimeSlotId;
  timeSlotLabel: string; // "早 08:55"
  customTime?: string; // e.g. "15:40"
  totalStudents: number;
  submittedCount: number;
  unsubmittedCount: number;
  unsubmittedStudents: StudentUnsubmittedRef[];
  note?: string;
  createdAt: string; // ISO string
}

export interface StudentStatSummary {
  studentId: number;
  code: string;
  name: string;
  unsubmittedTotal: number;
  morningCount: number;
  noonCount: number;
  eveningCount: number;
  customCount: number;
  lastUnsubmittedDate?: string;
  rate: number; // unsubmitted count / total inspections
}

export interface AppBackupData {
  version: string;
  appName: string;
  exportedAt: string;
  className: string;
  studentsCount: number;
  recordsCount: number;
  data: {
    className: string;
    students: Student[];
    records: InspectionRecord[];
    noticeConfig?: NoticeConfig;
  };
}

export interface NoticeConfig {
  templateType: 'standard' | 'simple' | 'compact' | 'raw';
  includeStudentCodes: boolean;
  customNoticeNote: string;
  customSignature: string;
  customHeaderTitle?: string;
}
