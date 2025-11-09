// Simple simulation of the merge algorithm used in services/firestore.ts
function makeDeterministicLectureId(date, subjectId, index) {
  const sid = (subjectId || 'unknown').toString().replace(/\s+/g, '_');
  return `${date}|${sid}|${index}`;
}

function mergeLectures(existingLecturesRaw, incoming, date) {
  const map = new Map();

  for (const e of existingLecturesRaw) {
    if (!e) continue;
    if (e.id) {
      map.set(e.id, Object.assign({}, e));
    } else if (e.subjectId && typeof e.lectureIndex === 'number') {
      const id = makeDeterministicLectureId(date, e.subjectId, e.lectureIndex);
      map.set(id, Object.assign({}, { id, ...e }));
    } else {
      const id = `legacy_${Math.random().toString(36).slice(2, 10)}`;
      map.set(id, Object.assign({}, { id, ...e }));
    }
  }

  for (const incRaw of incoming) {
    const inc = Object.assign({}, incRaw);
    inc.id = inc.id || makeDeterministicLectureId(date, inc.subjectId, inc.lectureIndex || 0);
    inc.createdAt = inc.createdAt || Date.now();
    inc.updatedAt = inc.updatedAt || Date.now();

    const existing = map.get(inc.id);
    if (!existing) {
      map.set(inc.id, inc);
      continue;
    }

    const existUpdated = existing.updatedAt || 0;
    const incUpdated = inc.updatedAt || Date.now();
    if (incUpdated > existUpdated) {
      map.set(inc.id, Object.assign({}, existing, inc, { updatedAt: incUpdated }));
    }
  }

  return Array.from(map.values());
}

// Scenario 1: two devices create deterministic entries for same lectures
const date = '2025-10-31';
const existing = [];

// Device A marks MATH101 lecture 1 present
const deviceA = [
  { id: makeDeterministicLectureId(date, 'MATH101', 1), subject: 'Math', subjectId: 'MATH101', lectureIndex: 1, attended: true, updatedAt: Date.now() - 1000, deviceId: 'A' }
];

// Device B later marks same lecture (same deterministic id) present too (maybe offline then sync)
const deviceB = [
  { id: makeDeterministicLectureId(date, 'MATH101', 1), subject: 'Math', subjectId: 'MATH101', lectureIndex: 1, attended: true, updatedAt: Date.now(), deviceId: 'B' }
];

console.log('--- Scenario 1: deterministic ids (no duplicates) ---');
let merged = mergeLectures(existing, deviceA, date);
merged = mergeLectures(merged, deviceB, date);
console.log('Merged entries:', merged);

// Scenario 2: devices create non-deterministic ids (UUID-like) for the same logical lecture
console.log('\n--- Scenario 2: different ids (possible duplicates) ---');
const deviceC = [
  { id: 'uuid-1', subject: 'Physics', subjectId: 'PHY101', lectureIndex: 1, attended: true, updatedAt: Date.now() - 2000, deviceId: 'C' }
];
const deviceD = [
  { id: 'uuid-2', subject: 'Physics', subjectId: 'PHY101', lectureIndex: 1, attended: true, updatedAt: Date.now() - 1000, deviceId: 'D' }
];
let merged2 = mergeLectures([], deviceC, date);
merged2 = mergeLectures(merged2, deviceD, date);
console.log('Merged entries (may contain duplicates):', merged2);

// Show dedupe suggestion: if lectureIndex & subjectId match, we could collapse duplicates
console.log('\n--- Post-processing suggestion: dedupe by subjectId+lectureIndex ---');
function collapseBySubjectIndex(list) {
  const m = new Map();
  for (const e of list) {
    const key = `${e.subjectId}::${e.lectureIndex}`;
    const existing = m.get(key);
    if (!existing) m.set(key, e);
    else {
      // pick latest updatedAt
      if ((e.updatedAt || 0) > (existing.updatedAt || 0)) m.set(key, e);
    }
  }
  return Array.from(m.values());
}
console.log('Collapsed:', collapseBySubjectIndex(merged2));
