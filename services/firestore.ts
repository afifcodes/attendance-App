import { db } from './firebase';
import {
  doc,
  setDoc,
  getDoc,
  writeBatch,
  collection,
  query,
  getDocs,
  serverTimestamp,
  DocumentData,
} from 'firebase/firestore';

export type DayEntry = {
  subject: string;
  subjectId?: string;
  lectures: number;
  attended: number;
  // optional status or other fields may exist in your app
  status?: string;
};

/**
 * Save one day's attendance under users/{uid}/attendance/{yyyy-MM-dd}
 */
export async function saveDayAttendanceToCloud(
  uid: string,
  date: string,
  entries: DayEntry[]
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');
  if (!date) throw new Error('Missing date');

  const ref = doc(db, 'users', uid, 'attendance', date);
  await setDoc(ref, {
    entries,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Load attendance for a specific date. Returns null when not found.
 */
export async function getDayAttendanceFromCloud(
  uid: string,
  date: string
): Promise<DayEntry[] | null> {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) return null;
  if (!date) return null;

  const ref = doc(db, 'users', uid, 'attendance', date);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return (data.entries as DayEntry[]) ?? null;
}

/**
 * Migrate a local records object to Firestore in a single batched write.
 * localRecords shape: { '2025-10-31': DayEntry[], '2025-10-30': DayEntry[] }
 */
export async function migrateLocalToCloud(
  uid: string,
  localRecords: Record<string, DayEntry[]>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');

  const batch = writeBatch(db);

  for (const [date, entries] of Object.entries(localRecords)) {
    const ref = doc(db, 'users', uid, 'attendance', date);
    batch.set(ref, {
      entries,
      updatedAt: serverTimestamp(),
    }, { merge: true } as any);
  }

  await batch.commit();
}

/** Optional helper: list all attendance docs for a user. Not required but useful. */
export async function listAllAttendanceDays(uid: string) {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');

  const q = query(collection(db, 'users', uid, 'attendance'));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export default {
  saveDayAttendanceToCloud,
  getDayAttendanceFromCloud,
  migrateLocalToCloud,
  listAllAttendanceDays,
};
