#!/usr/bin/env node
/*
 One-time migration script to convert legacy aggregated `entries` documents
 under users/{uid}/attendance/{date} into per-lecture `lectures` arrays.

 Usage:
 1. Create a Firebase service account JSON and set env var:
    setx FIREBASE_SERVICE_ACCOUNT "C:\path\to\serviceAccountKey.json"
    (or export FIREBASE_SERVICE_ACCOUNT=/path/to/key.json on *nix)

 2. Run:
    node scripts/migrate-cloud-to-lectures.js

 The script is idempotent: it generates deterministic lecture ids using
 date|subjectId|index so running multiple times won't create duplicates.
 It will skip documents that already have a `lectures` array.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function makeDeterministicLectureId(date, subjectId, index) {
  const sid = (subjectId || 'unknown').toString().replace(/\s+/g, '_');
  return `${date}|${sid}|${index}`;
}

async function main() {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT || process.argv[2];
  if (!keyPath) {
    console.error('Service account key path required as FIREBASE_SERVICE_ACCOUNT env or first arg.');
    process.exit(1);
  }

  const abs = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
  if (!fs.existsSync(abs)) {
    console.error('Service account file not found at', abs);
    process.exit(1);
  }

  const serviceAccount = require(abs);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('Scanning users/*/attendance');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users`);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    console.log('\nUser:', uid);
    const attendCol = db.collection('users').doc(uid).collection('attendance');
    const docs = await attendCol.get();
    console.log(` - attendance docs: ${docs.size}`);

    for (const d of docs.docs) {
      const date = d.id;
      const data = d.data() || {};
      if (Array.isArray(data.lectures) && data.lectures.length > 0) {
        console.log(`   - ${date}: already migrated (lectures present), skipping`);
        continue;
      }

      const entries = Array.isArray(data.entries) ? data.entries : [];
      if (entries.length === 0) {
        console.log(`   - ${date}: no entries found, skipping`);
        continue;
      }

      const mergedMap = new Map();

      // expand aggregates into per-lecture entries
      for (const e of entries) {
        const subjectId = e.subjectId || e.subject;
        const lectures = e.lectures || 0;
        const attended = e.attended || 0;
        for (let i = 1; i <= lectures; i++) {
          const id = makeDeterministicLectureId(date, subjectId, i);
          const entry = {
            id,
            subject: e.subject || subjectId,
            subjectId,
            lectureIndex: i,
            attended: i <= attended,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          mergedMap.set(id, entry);
        }
      }

      const lectures = Array.from(mergedMap.values());
      try {
        await d.ref.set({ lectures, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log(`   - ${date}: migrated ${lectures.length} lecture entries`);
      } catch (err) {
        console.error(`   - ${date}: failed to write`, err);
      }
    }
  }

  console.log('\nMigration completed');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error', err);
  process.exit(2);
});
