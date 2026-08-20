import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, IS_FIREBASE_ENABLED } from '../lib/firebase';
import { InspectionRecord, Student, NoticeConfig } from '../types';
import { deriveClassDocId } from '../config/access';
import {
  loadStoredStudents,
  saveStoredStudents,
  getStoredClassName,
  setStoredClassName,
  loadInspectionRecords,
  saveInspectionRecords,
  getDemoSeedRecords,
  getStoredNoticeConfig,
  saveStoredNoticeConfig,
} from './storage';

// 早期版本把班级数据固定存在 classes/main_class，路径可被任何人猜到。
// 现在文档 ID 由访问口令派生：不知道口令就推不出数据路径。
export const LEGACY_CLASS_DOC_ID = 'main_class';

let activeClassDocId = LEGACY_CLASS_DOC_ID;
let initialized = false;

/** 当前班级文档 ID。必须在 initClassDocId() 之后调用。 */
export function getClassDocId(): string {
  return activeClassDocId;
}

/**
 * 用访问口令初始化云端数据路径，并在首次使用时把旧的
 * classes/main_class 数据（含 inspections 子集合）迁移过来。
 * 幂等：重复调用只会执行一次。
 */
export async function initClassDocId(passcode: string): Promise<string> {
  activeClassDocId = await deriveClassDocId(passcode);

  if (!IS_FIREBASE_ENABLED || !db || initialized) return activeClassDocId;
  initialized = true;

  try {
    const targetRef = doc(db, 'classes', activeClassDocId);
    const targetSnap = await getDoc(targetRef);
    if (targetSnap.exists()) return activeClassDocId;

    const legacyRef = doc(db, 'classes', LEGACY_CLASS_DOC_ID);
    const legacySnap = await getDoc(legacyRef);
    if (!legacySnap.exists()) return activeClassDocId;

    // 搬运班级文档本体
    await setDoc(targetRef, legacySnap.data());

    // 搬运点验记录子集合
    const legacyRecords = await getDocs(
      collection(db, 'classes', LEGACY_CLASS_DOC_ID, 'inspections')
    );
    const docs = legacyRecords.docs;
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(db);
      docs.slice(i, i + chunkSize).forEach((d) => {
        batch.set(doc(db, 'classes', activeClassDocId, 'inspections', d.id), d.data());
      });
      await batch.commit();
    }

    console.info(`已迁移 ${docs.length} 条点验记录到新的云端路径。`);
  } catch (e) {
    console.warn('云端数据迁移失败，将以本地数据继续：', e);
  }

  return activeClassDocId;
}

/**
 * Sync status state type
 */
export type CloudSyncStatus = 'connected' | 'syncing' | 'synced' | 'offline' | 'error';

/**
 * 1. Real-time subscribe to Class details (Class name, Student roster & Notice Config)
 */
export function subscribeToClassData(
  onClassUpdated: (data: { className: string; students: Student[]; noticeConfig?: NoticeConfig }) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!IS_FIREBASE_ENABLED || !db) return null;

  try {
    const classDocRef = doc(db, 'classes', getClassDocId());
    return onSnapshot(
      classDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const className = data.className || getStoredClassName();
          const students: Student[] = Array.isArray(data.students) && data.students.length > 0
            ? data.students
            : loadStoredStudents();
          const noticeConfig: NoticeConfig = data.noticeConfig
            ? { ...getStoredNoticeConfig(), ...data.noticeConfig }
            : getStoredNoticeConfig();

          // Sync to local storage as fallback
          setStoredClassName(className);
          saveStoredStudents(students);
          if (data.noticeConfig) {
            saveStoredNoticeConfig(data.noticeConfig);
          }

          onClassUpdated({ className, students, noticeConfig });
        } else {
          // Initialize class document in Cloud Firestore if it doesn't exist yet
          const initialClassName = getStoredClassName();
          const initialStudents = loadStoredStudents();
          const initialNoticeConfig = getStoredNoticeConfig();
          setDoc(classDocRef, {
            className: initialClassName,
            students: initialStudents,
            noticeConfig: initialNoticeConfig,
            updatedAt: new Date().toISOString(),
          }).catch(console.error);

          onClassUpdated({
            className: initialClassName,
            students: initialStudents,
            noticeConfig: initialNoticeConfig,
          });
        }
      },
      (error) => {
        console.warn('Firebase class subscribe error:', error);
        onError?.(error);
      }
    );
  } catch (e) {
    console.warn('Failed to subscribeToClassData', e);
    return null;
  }
}

/**
 * 2. Real-time subscribe to Inspection Records
 */
export function subscribeToInspectionRecords(
  onRecordsUpdated: (records: InspectionRecord[]) => void,
  onError?: (err: any) => void
): Unsubscribe | null {
  if (!IS_FIREBASE_ENABLED || !db) return null;

  try {
    const inspectionsColl = collection(db, 'classes', getClassDocId(), 'inspections');
    const q = query(inspectionsColl, orderBy('date', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const records: InspectionRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as InspectionRecord;
          records.push({
            ...data,
            id: docSnap.id,
          });
        });
        // Cache locally
        saveInspectionRecords(records);
        onRecordsUpdated(records);
      },
      (error) => {
        console.warn('Firebase inspections subscribe error:', error);
        onError?.(error);
      }
    );
  } catch (e) {
    console.warn('Failed to subscribeToInspectionRecords', e);
    return null;
  }
}

/**
 * 3. Save / Update a single Inspection record to Cloud Firestore
 */
export async function saveRecordToCloud(record: InspectionRecord): Promise<boolean> {
  if (!IS_FIREBASE_ENABLED || !db) return false;

  try {
    const recordDocRef = doc(db, 'classes', getClassDocId(), 'inspections', record.id);
    await setDoc(recordDocRef, record, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to save record to cloud:', e);
    return false;
  }
}

/**
 * 3.1 Delete a single Inspection record from Cloud Firestore
 */
export async function deleteRecordFromCloud(recordId: string): Promise<boolean> {
  if (!IS_FIREBASE_ENABLED || !db) return false;

  try {
    const recordDocRef = doc(db, 'classes', getClassDocId(), 'inspections', recordId);
    await deleteDoc(recordDocRef);
    return true;
  } catch (e) {
    console.error('Failed to delete record from cloud:', e);
    return false;
  }
}

/**
 * 3.2 Clear ALL Inspection records from Cloud Firestore
 */
export async function clearAllCloudRecords(): Promise<boolean> {
  if (!IS_FIREBASE_ENABLED || !db) return false;

  try {
    const inspectionsColl = collection(db, 'classes', getClassDocId(), 'inspections');
    const snapshot = await getDocs(inspectionsColl);
    if (snapshot.empty) return true;

    // Batch delete in chunks of 400
    const docs = snapshot.docs;
    const chunkSize = 400;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const batch = writeBatch(db);
      docs.slice(i, i + chunkSize).forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
    return true;
  } catch (e) {
    console.error('Failed to clear cloud inspection records:', e);
    return false;
  }
}

/**
 * 4. Save students roster, class name and notice config to Cloud Firestore
 */
export async function syncClassDataToCloud(
  className: string,
  students: Student[],
  noticeConfig?: NoticeConfig
): Promise<boolean> {
  if (!IS_FIREBASE_ENABLED || !db) return false;

  try {
    const classDocRef = doc(db, 'classes', getClassDocId());
    const payload: any = {
      className,
      students,
      updatedAt: new Date().toISOString(),
    };
    if (noticeConfig) {
      payload.noticeConfig = noticeConfig;
    }
    await setDoc(classDocRef, payload, { merge: true });
    return true;
  } catch (e) {
    console.error('Failed to sync class data to cloud:', e);
    return false;
  }
}

/**
 * 4.1 Save notice template config to Cloud Firestore directly
 */
export async function syncNoticeConfigToCloud(noticeConfig: NoticeConfig): Promise<boolean> {
  if (!IS_FIREBASE_ENABLED || !db) return false;

  try {
    const classDocRef = doc(db, 'classes', getClassDocId());
    await setDoc(
      classDocRef,
      {
        noticeConfig,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (e) {
    console.error('Failed to sync notice config to cloud:', e);
    return false;
  }
}

/**
 * 5. Batch overwrite all records to cloud (used when loading demo or restoring backup)
 */
export async function batchSyncRecordsToCloud(records: InspectionRecord[]): Promise<boolean> {
  if (!IS_FIREBASE_ENABLED || !db) return false;

  try {
    // Firestore batch limit is 500
    const chunks = [];
    const chunkSize = 400;
    for (let i = 0; i < records.length; i += chunkSize) {
      chunks.push(records.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach((rec) => {
        const rRef = doc(db, 'classes', getClassDocId(), 'inspections', rec.id);
        batch.set(rRef, rec);
      });
      await batch.commit();
    }
    return true;
  } catch (e) {
    console.error('Failed to batch sync records to cloud:', e);
    return false;
  }
}
