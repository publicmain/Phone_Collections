import { InspectionRecord, TimeSlotConfig, TimeSlotId, Student, AppBackupData, NoticeConfig } from '../types';
import { INITIAL_STUDENTS } from '../data/students';

export const DEFAULT_NOTICE_CONFIG: NoticeConfig = {
  templateType: 'standard',
  includeStudentCodes: true,
  customNoticeNote: '请上述未存放手机的同学立即前往教室手机存放柜完成入箱归位。全体同学应严格遵守校园移动通讯设备管理规定，共同维护严谨专注的学习与教学秩序。',
  customSignature: '班级规范化管理组',
  customHeaderTitle: '关于学生手机定点存放点验情况的通告',
};

export const TIME_SLOTS: TimeSlotConfig[] = [
  {
    id: 'morning',
    name: '早自习收手机',
    time: '08:55',
    periodName: '早 08:55',
    color: 'amber',
    icon: 'Sun',
  },
  {
    id: 'noon',
    name: '中午上课收手机',
    time: '13:30',
    periodName: '中午 13:30',
    color: 'blue',
    icon: 'SunMedium',
  },
  {
    id: 'evening',
    name: '晚自习收手机',
    time: '18:00',
    periodName: '晚自习 18:00',
    color: 'indigo',
    icon: 'Moon',
  },
  {
    id: 'custom',
    name: '临时/随堂抽查',
    time: '临时',
    periodName: '自定义时段',
    color: 'zinc',
    icon: 'Clock',
  },
];

const STORAGE_KEY = 'phone_box_inspection_records_v1';
const CLASS_NAME_KEY = 'phone_box_class_name';
const STUDENTS_STORAGE_KEY = 'phone_box_students_list_v1';
const NOTICE_CONFIG_KEY = 'phone_box_notice_config_v1';

export function getStoredNoticeConfig(): NoticeConfig {
  try {
    const raw = localStorage.getItem(NOTICE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        templateType: parsed.templateType || DEFAULT_NOTICE_CONFIG.templateType,
        includeStudentCodes: parsed.includeStudentCodes ?? DEFAULT_NOTICE_CONFIG.includeStudentCodes,
        customNoticeNote: parsed.customNoticeNote || DEFAULT_NOTICE_CONFIG.customNoticeNote,
        customSignature: parsed.customSignature || DEFAULT_NOTICE_CONFIG.customSignature,
        customHeaderTitle: parsed.customHeaderTitle || DEFAULT_NOTICE_CONFIG.customHeaderTitle,
      };
    }
  } catch (e) {
    console.error('Failed to load stored notice config', e);
  }
  return { ...DEFAULT_NOTICE_CONFIG };
}

export function saveStoredNoticeConfig(config: Partial<NoticeConfig>): NoticeConfig {
  try {
    const current = getStoredNoticeConfig();
    const updated: NoticeConfig = { ...current, ...config };
    localStorage.setItem(NOTICE_CONFIG_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save notice config', e);
    return { ...DEFAULT_NOTICE_CONFIG, ...config };
  }
}

export function resetStoredNoticeConfig(): NoticeConfig {
  try {
    localStorage.setItem(NOTICE_CONFIG_KEY, JSON.stringify(DEFAULT_NOTICE_CONFIG));
  } catch (e) {
    console.error('Failed to reset notice config', e);
  }
  return { ...DEFAULT_NOTICE_CONFIG };
}

export function getStoredClassName(): string {
  try {
    return localStorage.getItem(CLASS_NAME_KEY) || '高一(1)班';
  } catch {
    return '高一(1)班';
  }
}

export function setStoredClassName(name: string): void {
  try {
    localStorage.setItem(CLASS_NAME_KEY, name);
  } catch (e) {
    console.error('Failed to save class name', e);
  }
}

/**
 * Load student roster from storage (falls back to INITIAL_STUDENTS)
 */
export function loadStoredStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) {
      return INITIAL_STUDENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_STUDENTS;
  } catch (e) {
    console.error('Failed to load students from storage', e);
    return INITIAL_STUDENTS;
  }
}

/**
 * Save student roster to storage
 */
export function saveStoredStudents(students: Student[]): void {
  try {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students to storage', e);
  }
}

/**
 * Intelligent helper to detect the closest/current time slot based on system clock
 */
export function detectCurrentTimeSlot(): TimeSlotId {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // 08:55 = 535 mins
  // 13:30 = 810 mins
  // 18:00 = 1080 mins

  if (currentMinutes <= 630) {
    // Up to 10:30 AM -> Morning
    return 'morning';
  } else if (currentMinutes <= 930) {
    // 10:30 AM to 15:30 -> Noon
    return 'noon';
  } else {
    // After 15:30 -> Evening
    return 'evening';
  }
}

/**
 * Get formatted current date in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Load all inspection records
 */
export function loadInspectionRecords(): InspectionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Return initial seed demo records so stats page isn't blank
      return getDemoSeedRecords();
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load inspection records', e);
    return [];
  }
}

/**
 * Save all inspection records
 */
export function saveInspectionRecords(records: InspectionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save inspection records', e);
  }
}

/**
 * Add a new record
 */
export function addInspectionRecord(record: InspectionRecord): InspectionRecord[] {
  const current = loadInspectionRecords();
  // Prepend to top
  const updated = [record, ...current];
  saveInspectionRecords(updated);
  return updated;
}

/**
 * Delete a record by id
 */
export function deleteInspectionRecord(id: string): InspectionRecord[] {
  const current = loadInspectionRecords();
  const updated = current.filter((r) => r.id !== id);
  saveInspectionRecords(updated);
  return updated;
}

/**
 * Clear all records
 */
export function clearAllRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Generate initial sample history for the past 5 school days
 */
export function getDemoSeedRecords(): InspectionRecord[] {
  const today = new Date();
  const records: InspectionRecord[] = [];
  
  // Sample students from initial list
  const sampleStudents = [
    { id: 2, code: '02', name: '赵一鸣' },
    { id: 6, code: '06', name: '胡齐家' },
    { id: 11, code: '11', name: '胡鑫瑜' },
    { id: 18, code: '18', name: '叶书瑞' },
    { id: 24, code: '24', name: '郑稀瑜' },
    { id: 26, code: '26', name: '祝振豪' },
    { id: 30, code: '30', name: '李永轩' },
  ];

  for (let i = 4; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Morning record
    const morningUnsub = i === 0 
      ? [sampleStudents[0], sampleStudents[4]] 
      : i === 1 
      ? [sampleStudents[0], sampleStudents[1], sampleStudents[5]]
      : i === 2 
      ? [] 
      : [sampleStudents[0]];

    records.push({
      id: `seed-${dateStr}-morning`,
      date: dateStr,
      timeSlot: 'morning',
      timeSlotLabel: '早 08:55',
      totalStudents: 34,
      submittedCount: 34 - morningUnsub.length,
      unsubmittedCount: morningUnsub.length,
      unsubmittedStudents: morningUnsub,
      note: morningUnsub.length === 0 ? '全员准时入箱，表现优秀' : '已在班级群通知提醒',
      createdAt: new Date(`${dateStr}T08:57:00`).toISOString(),
    });

    // Noon record
    const noonUnsub = i === 1 
      ? [sampleStudents[2], sampleStudents[3]] 
      : i === 3 
      ? [sampleStudents[0], sampleStudents[2]] 
      : [sampleStudents[4]];

    records.push({
      id: `seed-${dateStr}-noon`,
      date: dateStr,
      timeSlot: 'noon',
      timeSlotLabel: '中午 13:30',
      totalStudents: 34,
      submittedCount: 34 - noonUnsub.length,
      unsubmittedCount: noonUnsub.length,
      unsubmittedStudents: noonUnsub,
      note: '午休后收纳',
      createdAt: new Date(`${dateStr}T13:32:00`).toISOString(),
    });

    // Evening record
    const eveningUnsub = i === 2 
      ? [sampleStudents[0], sampleStudents[6]] 
      : i === 0 
      ? [sampleStudents[0]] 
      : [];

    records.push({
      id: `seed-${dateStr}-evening`,
      date: dateStr,
      timeSlot: 'evening',
      timeSlotLabel: '晚自习 18:00',
      totalStudents: 34,
      submittedCount: 34 - eveningUnsub.length,
      unsubmittedCount: eveningUnsub.length,
      unsubmittedStudents: eveningUnsub,
      note: eveningUnsub.length === 0 ? '晚自习全员准时' : '已催促交齐',
      createdAt: new Date(`${dateStr}T18:02:00`).toISOString(),
    });
  }

  return records;
}

/**
 * Generate full backup data object
 */
export function createBackupData(): AppBackupData {
  const className = getStoredClassName();
  const students = loadStoredStudents();
  const records = loadInspectionRecords();
  const noticeConfig = getStoredNoticeConfig();

  return {
    version: '1.0',
    appName: '班级学生手机存放编号管理系统',
    exportedAt: new Date().toISOString(),
    className,
    studentsCount: students.length,
    recordsCount: records.length,
    data: {
      className,
      students,
      records,
      noticeConfig,
    },
  };
}

/**
 * Trigger download of full JSON backup file
 */
export function downloadBackupJsonFile(): void {
  const backup = createBackupData();
  const jsonStr = JSON.stringify(backup, null, 2);
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  
  const filename = `班级手机管理系统备份_${backup.className}_${timestamp}.json`;
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse uploaded backup JSON string
 */
export function parseAndValidateBackup(jsonString: string): {
  valid: boolean;
  data?: AppBackupData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: '文件格式错误：非标准 JSON 对象' };
    }

    // Support both direct wrapper or raw root data format
    let dataObj = parsed.data || parsed;
    if (!Array.isArray(dataObj.records) && !Array.isArray(parsed.records)) {
      return { valid: false, error: '备份文件中未找到有效的点验记录数据 (records)' };
    }

    const records: InspectionRecord[] = Array.isArray(dataObj.records)
      ? dataObj.records
      : Array.isArray(parsed.records)
      ? parsed.records
      : [];

    const students: Student[] = Array.isArray(dataObj.students)
      ? dataObj.students
      : Array.isArray(parsed.students)
      ? parsed.students
      : loadStoredStudents();

    const className: string =
      dataObj.className || parsed.className || getStoredClassName();

    const noticeConfig: NoticeConfig | undefined = dataObj.noticeConfig || parsed.noticeConfig;

    const structuredBackup: AppBackupData = {
      version: parsed.version || '1.0',
      appName: parsed.appName || '班级学生手机存放编号管理系统',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      className,
      studentsCount: students.length,
      recordsCount: records.length,
      data: {
        className,
        students,
        records,
        noticeConfig,
      },
    };

    return { valid: true, data: structuredBackup };
  } catch (e: any) {
    return { valid: false, error: `解析 JSON 失败：${e?.message || '文件损坏'}` };
  }
}

/**
 * Execute restore from validated backup data
 */
export function restoreFromBackupData(
  backup: AppBackupData,
  mode: 'overwrite' | 'merge' = 'overwrite'
): { success: boolean; recordsCount: number; studentsCount: number; message: string } {
  try {
    const importRecords = backup.data.records || [];
    const importStudents = backup.data.students || [];
    const importClassName = backup.data.className;
    const importNoticeConfig = backup.data.noticeConfig;

    if (mode === 'overwrite') {
      if (importClassName) setStoredClassName(importClassName);
      if (importStudents.length > 0) saveStoredStudents(importStudents);
      if (importNoticeConfig) saveStoredNoticeConfig(importNoticeConfig);
      saveInspectionRecords(importRecords);

      return {
        success: true,
        recordsCount: importRecords.length,
        studentsCount: importStudents.length,
        message: `覆盖还原成功！已恢复 ${importRecords.length} 条历史点验记录与 ${importStudents.length} 名学生名单。`,
      };
    } else {
      // Merge mode: deduplicate records by id
      const currentRecords = loadInspectionRecords();
      const currentIds = new Set(currentRecords.map((r) => r.id));
      
      const newRecordsToAdd = importRecords.filter((r) => !currentIds.has(r.id));
      const mergedRecords = [...newRecordsToAdd, ...currentRecords].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      saveInspectionRecords(mergedRecords);

      if (importNoticeConfig) {
        saveStoredNoticeConfig(importNoticeConfig);
      }

      // Merge students if provided
      const currentStudents = loadStoredStudents();
      const studentMap = new Map<number, Student>();
      currentStudents.forEach((s) => studentMap.set(s.id, s));
      importStudents.forEach((s) => {
        studentMap.set(s.id, s); // Overwrite/add by id
      });
      const mergedStudents = Array.from(studentMap.values()).sort((a, b) =>
        a.code.localeCompare(b.code)
      );
      saveStoredStudents(mergedStudents);

      if (importClassName && !getStoredClassName()) {
        setStoredClassName(importClassName);
      }

      return {
        success: true,
        recordsCount: mergedRecords.length,
        studentsCount: mergedStudents.length,
        message: `合并恢复成功！新增合并了 ${newRecordsToAdd.length} 条新记录，当前共 ${mergedRecords.length} 条点验记录。`,
      };
    }
  } catch (e: any) {
    console.error('Failed to restore backup', e);
    return {
      success: false,
      recordsCount: 0,
      studentsCount: 0,
      message: `恢复失败：${e?.message || '未知错误'}`,
    };
  }
}
