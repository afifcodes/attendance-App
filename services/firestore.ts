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
  runTransaction,
} from 'firebase/firestore';

export type DayEntry = {
  subject: string;
  subjectId?: string;
  lectures: number;
  attended: number;
  // optional status or other fields may exist in your app
  status?: string;
};

/** New per-lecture entry model to enable idempotent merges */
export type LectureEntry = {
  id: string; // deterministic or UUID
  subject: string;
  subjectId?: string;
  lectureIndex?: number; // 1-based index within the day for that subject
  attended: boolean; // true if present
  createdAt?: number; // epoch ms (client)
  updatedAt?: number; // epoch ms (client)
  deviceId?: string;
};

function makeDeterministicLectureId(date: string, subjectId: string | undefined, index: number) {
  // simple deterministic id that is safe for Firestore doc fields
  const sid = (subjectId || 'unknown').toString().replace(/\s+/g, '_');
  return `${date}|${sid}|${index}`;
}

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
    // legacy support: keep `entries` for older clients
    entries,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Save/merge an array of per-lecture entries into the cloud in a transaction.
 * This function is idempotent when lecture entries include stable `id` values.
 */
export async function saveDayAttendanceWithMerge(
  uid: string,
  date: string,
  incoming: LectureEntry[]
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');
  if (!date) throw new Error('Missing date');

  const ref = doc(db, 'users', uid, 'attendance', date);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const existingData = snap.exists() ? (snap.data() as DocumentData) : {};

    // normalize existing lectures from either new `lectures` field or legacy `entries`
    const existingLecturesRaw = Array.isArray(existingData.lectures)
      ? existingData.lectures
      : Array.isArray(existingData.entries)
        ? // expand legacy aggregates if necessary
          existingData.entries
        : [];

    const map = new Map<string, LectureEntry>();

    // load existing into map (if an existing item lacks id, try to create deterministic key)
    for (const e of existingLecturesRaw) {
      if (!e) continue;
      if (e.id) {
        map.set(e.id, {
          id: e.id,
          subject: e.subject || e.subjectId || 'unknown',
          subjectId: e.subjectId,
          lectureIndex: e.lectureIndex,
          attended: !!e.attended,
          createdAt: e.createdAt || 0,
          updatedAt: e.updatedAt || 0,
          deviceId: e.deviceId,
        });
      } else if (e.subjectId && typeof e.lectureIndex === 'number') {
        const id = makeDeterministicLectureId(date, e.subjectId, e.lectureIndex);
        map.set(id, {
          id,
          subject: e.subject || e.subjectId,
          subjectId: e.subjectId,
          lectureIndex: e.lectureIndex,
          attended: !!e.attended,
          createdAt: e.createdAt || 0,
          updatedAt: e.updatedAt || 0,
        });
      } else {
        // fallback: create a synthetic id using index in array
        const id = `legacy_${Math.random().toString(36).slice(2, 10)}`;
        map.set(id, {
          id,
          subject: e.subject || 'unknown',
          subjectId: e.subjectId,
          lectureIndex: e.lectureIndex,
          attended: !!e.attended,
          createdAt: e.createdAt || 0,
          updatedAt: e.updatedAt || 0,
        });
      }
    }

    // merge incoming
    for (const incRaw of incoming) {
      const inc: LectureEntry = {
        id: incRaw.id || makeDeterministicLectureId(date, incRaw.subjectId, incRaw.lectureIndex ?? 0),
        subject: incRaw.subject,
        subjectId: incRaw.subjectId,
        lectureIndex: incRaw.lectureIndex,
        attended: !!incRaw.attended,
        createdAt: incRaw.createdAt || Date.now(),
        updatedAt: incRaw.updatedAt || Date.now(),
        deviceId: incRaw.deviceId,
      };

      const existing = map.get(inc.id);
      if (!existing) {
        map.set(inc.id, inc);
        continue;
      }

      // merge rule: prefer entry with higher updatedAt
      const existUpdated = existing.updatedAt || 0;
      const incUpdated = inc.updatedAt || Date.now();
      if (incUpdated > existUpdated) {
        map.set(inc.id, { ...existing, ...inc, updatedAt: incUpdated });
      }
    }

    const merged = Array.from(map.values());

    tx.set(ref, { lectures: merged, updatedAt: serverTimestamp() }, { merge: true } as any);
  });
}

/**
 * NEW: period-aware APIs
 * Path: users/{uid}/attendancePeriods/{periodId}/attendance/{date}/lectures/{lectureId}
 */

export function monthFromDate(date: string) {
  // expect date in yyyy-MM-dd
  return date.slice(0, 7);
}

export async function saveDayAttendanceForPeriod(
  uid: string,
  periodId: string,
  date: string,
  incoming: LectureEntry[]
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');
  if (!periodId) throw new Error('Missing periodId');
  if (!date) throw new Error('Missing date');

  const batch = writeBatch(db);
  const basePath = collection(db, 'users', uid, 'attendancePeriods', periodId, 'attendance');
  const dateDocRef = doc(db, 'users', uid, 'attendancePeriods', periodId, 'attendance', date);

  // ensure a date doc exists with updatedAt
  batch.set(dateDocRef, { updatedAt: serverTimestamp(), startDate: date }, { merge: true } as any);

  for (const entry of incoming) {
    const lectureRef = doc(db, 'users', uid, 'attendancePeriods', periodId, 'attendance', date, 'lectures', entry.id);
    batch.set(lectureRef, {
      subject: entry.subject,
      subjectId: entry.subjectId,
      lectureIndex: entry.lectureIndex,
      attended: !!entry.attended,
      createdAt: entry.createdAt || Date.now(),
      updatedAt: entry.updatedAt || Date.now(),
      deviceId: entry.deviceId || null,
    }, { merge: true } as any);
  }

  await batch.commit();
}

export async function fetchAttendanceForPeriodDate(uid: string, periodId: string, date: string) {
  if (!db) throw new Error('Firestore not initialized');
  const lecturesCol = collection(db, 'users', uid, 'attendancePeriods', periodId, 'attendance', date, 'lectures');
  const snaps = await getDocs(lecturesCol);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function fetchAttendanceForActivePeriod(uid: string) {
  if (!db) throw new Error('Firestore not initialized');
  const pid = await getActivePeriodId(uid);
  if (!pid) return [];
  // returns list of { id: date, meta, lectures: [...] }
  return await listAttendanceForPeriod(uid, pid);
}

export async function listAttendanceForPeriod(uid: string, periodId: string) {
  if (!db) throw new Error('Firestore not initialized');
  const attendCol = collection(db, 'users', uid, 'attendancePeriods', periodId, 'attendance');
  const snaps = await getDocs(attendCol);
  const result: Array<any> = [];
  for (const d of snaps.docs) {
    const date = d.id;
    const meta = d.data();
    const lectures = await getDocs(collection(db, 'users', uid, 'attendancePeriods', periodId, 'attendance', date, 'lectures'));
    result.push({ id: date, meta, lectures: lectures.docs.map(ld => ({ id: ld.id, ...(ld.data() as any)})) });
  }
  return result;
}

export async function getActivePeriodId(uid: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  const profileRef = doc(db, 'users', uid, 'profile', 'meta');
  const snap = await getDoc(profileRef);
  if (snap.exists()) {
    const data = snap.data() as any;
    if (data.activePeriodId) return data.activePeriodId;
  }
  // default to current month
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function startNewPeriod(uid: string, periodId?: string): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');

  // Compute UTC-based periodId if not supplied
  const now = new Date();
  const defaultPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const pid = periodId || defaultPeriod;

  const periodRef = doc(db, 'users', uid, 'attendancePeriods', pid);
  const profileRef = doc(db, 'users', uid, 'profile');

  // Use transaction to get-or-create period and update profile.activePeriodId atomically
  await runTransaction(db, async (tx) => {
    const periodSnap = await tx.get(periodRef);
    if (!periodSnap.exists()) {
      tx.set(periodRef, { startDate: serverTimestamp(), createdAt: serverTimestamp(), resetReason: 'Manual monthly reset', createdBy: uid }, { merge: false } as any);
      console.log(`createdPeriod: ${pid}`);
    } else {
      console.log(`period already exists: ${pid}`);
    }

    // Update profile document with activePeriodId
    tx.set(profileRef, { activePeriodId: pid, updatedAt: serverTimestamp() }, { merge: true } as any);
    console.log(`updatedProfileActivePeriod: ${pid}`);
  });

  return pid;
}

export async function resetAttendancePeriod(uid: string): Promise<string> {
  // create a new period for current month and return id
  return await startNewPeriod(uid);
}

/** Migrate legacy /attendance/{date} docs into attendancePeriods/{yyyy-MM}/attendance/{date}/lectures */
export async function migrateOldAttendanceToPeriods(uid: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const oldCol = collection(db, 'users', uid, 'attendance');
  const snaps = await getDocs(oldCol);
  for (const d of snaps.docs) {
    const date = d.id; // assume yyyy-MM-dd
    const data = d.data() as any;
    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (entries.length === 0) continue;
    const periodId = monthFromDate(date);
    const lectures: LectureEntry[] = [];
    for (const e of entries) {
      const subjectId = e.subjectId || e.subject;
      for (let i = 1; i <= (e.lectures || 0); i++) {
        const id = `${date}|${subjectId}|${i}`;
        lectures.push({ id, subject: e.subject || subjectId, subjectId, lectureIndex: i, attended: i <= (e.attended || 0), createdAt: Date.now(), updatedAt: Date.now() });
      }
    }
    await saveDayAttendanceForPeriod(uid, periodId, date, lectures);
    // mark legacy doc migrated
    await setDoc(d.ref, { migratedToPeriods: true, migratedAt: serverTimestamp() }, { merge: true } as any);
  }
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

  // For safety and to avoid overwriting concurrent changes from other devices,
  // migrate each day's aggregates into per-lecture entries and merge using
  // the transactional merge helper.
  for (const [date, entries] of Object.entries(localRecords)) {
    // expand aggregated DayEntry[] into LectureEntry[]
    const lectures: LectureEntry[] = [];
    for (const e of entries) {
      const subjectId = e.subjectId || e.subject;
      // create one LectureEntry per lecture index
      for (let i = 1; i <= (e.lectures || 0); i++) {
        const id = makeDeterministicLectureId(date, subjectId, i);
        const attended = i <= (e.attended || 0);
        lectures.push({
          id,
          subject: e.subject,
          subjectId: e.subjectId,
          lectureIndex: i,
          attended,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // merge into cloud (transactional)
      const periodId = monthFromDate(date);
      await saveDayAttendanceForPeriod(uid, periodId, date, lectures);
  }
}

/** Optional helper: list all attendance docs for a user. Not required but useful. */
export async function listAllAttendanceDays(uid: string) {
  if (!db) throw new Error('Firestore not initialized');
  if (!uid) throw new Error('Missing uid');

  // Try legacy flat attendance first
  const legacyQ = query(collection(db, 'users', uid, 'attendance'));
  const legacySnaps = await getDocs(legacyQ);
  if (legacySnaps.size > 0) {
    return legacySnaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  // Otherwise, aggregate across attendancePeriods
  const periodsSnap = await getDocs(collection(db, 'users', uid, 'attendancePeriods'));
  const result: Array<any> = [];
  for (const p of periodsSnap.docs) {
    const periodId = p.id;
    const attendSnap = await getDocs(collection(db, 'users', uid, 'attendancePeriods', periodId, 'attendance'));
    for (const d of attendSnap.docs) {
      const date = d.id;
      const lecturesSnap = await getDocs(collection(db, 'users', uid, 'attendancePeriods', periodId, 'attendance', date, 'lectures'));
      // aggregate into legacy entries shape: { subjectId, subject, lectures, attended }
      const bySubject: Record<string, { subject?: string; lectures: number; attended: number }> = {};
      for (const ld of lecturesSnap.docs) {
        const data = ld.data() as any;
        const sid = data.subjectId || data.subject || 'unknown';
        if (!bySubject[sid]) bySubject[sid] = { subject: data.subject || sid, lectures: 0, attended: 0 };
        bySubject[sid].lectures = Math.max(bySubject[sid].lectures, data.lectureIndex || 0);
        if (data.attended) bySubject[sid].attended += 1;
      }
      const entries = Object.entries(bySubject).map(([subjectId, v]) => ({ subject: v.subject, subjectId, lectures: v.lectures, attended: v.attended }));
      result.push({ id: date, entries });
    }
  }
  return result;
}

export default {
  saveDayAttendanceToCloud,
  saveDayAttendanceWithMerge,
  saveDayAttendanceForPeriod,
  getDayAttendanceFromCloud,
  migrateLocalToCloud,
  migrateOldAttendanceToPeriods,
  fetchAttendanceForPeriodDate,
  listAttendanceForPeriod,
  getActivePeriodId,
  startNewPeriod,
  resetAttendancePeriod,
  listAllAttendanceDays,
};
