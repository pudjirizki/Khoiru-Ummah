import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Polyfill WebSocket for Node.js if needed by supabase-js
globalThis.WebSocket = class DummyWebSocket {};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const firebaseConfig = {
  apiKey: 'AIzaSyCuWEicGdo_Ps_aOzwYCs7JQKcmO1vcKuk',
  authDomain: 'project-khoiru-ummah-v2.firebaseapp.com',
  projectId: 'project-khoiru-ummah-v2',
  storageBucket: 'project-khoiru-ummah-v2.firebasestorage.app',
  messagingSenderId: '898632411630',
  appId: '1:898632411630:web:3f49492d8a31deb4bec6ff',
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const toIsoDate = (val) => {
  if (!val) return new Date().toISOString();
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

async function syncCollection(name, firestoreName, mapFn) {
  console.log(`\n--- Memproses koleksi: ${firestoreName} -> tabel: ${name} ---`);
  const snap = await getDocs(collection(firestore, firestoreName));
  const items = [];
  snap.forEach((doc) => {
    try {
      const mapped = mapFn(doc.id, doc.data());
      if (mapped) items.push(mapped);
    } catch (err) {
      console.warn(`Peringatan mapping pada doc ${doc.id}:`, err.message);
    }
  });

  console.log(`Ditemukan ${items.length} dokumen di Firestore.`);
  if (items.length === 0) return;

  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(name).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error(`Gagal upsert batch ${i + 1}-${i + chunk.length} ke ${name}:`, error.message);
    } else {
      inserted += chunk.length;
    }
  }

  console.log(`Berhasil menyinkronkan ${inserted}/${items.length} data ke tabel ${name}.`);
}

async function runMigration() {
  console.log('=== MEMULAI SINKRONISASI DATA FIRESTORE KE SUPABASE ===');

  // 1. Users
  await syncCollection('users', 'users', (id, d) => ({
    id,
    auth_id: d.authId || null,
    name: d.name || '',
    name_lowercase: d.nameLowercase || (d.name ? d.name.toLowerCase() : ''),
    phone_number: d.phoneNumber || null,
    role: d.role || 'parent',
    email: d.email || '',
    status: d.status || 'active',
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 2. Students
  await syncCollection('students', 'students', (id, d) => ({
    id,
    parent_id: d.parentId || null,
    name: d.name || '',
    name_lowercase: d.nameLowercase || (d.name ? d.name.toLowerCase() : ''),
    class: d.class || '',
    identity_number: d.identityNumber || '',
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 3. Forms
  await syncCollection('forms', 'forms', (id, d) => ({
    id,
    created_by: d.createdBy || null,
    title: d.title || '',
    class: Array.isArray(d.class) ? d.class : [d.class || ''],
    description: d.description || '',
    notes: d.notes || '',
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 4. Criterias
  await syncCollection('criterias', 'criterias', (id, d) => ({
    id,
    form_id: d.formId || null,
    title: d.title || '',
    description: d.description || '',
    weight: typeof d.weight === 'number' ? d.weight : 0,
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 5. Questions
  await syncCollection('questions', 'questions', (id, d) => ({
    id,
    criteria_id: d.criteriaId || null,
    order: typeof d.order === 'number' ? d.order : 1,
    text: d.text || '',
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 6. Assessments
  await syncCollection('assessments', 'assessments', (id, d) => ({
    id,
    form_id: d.formId || null,
    user_id: d.userId || null,
    student_id: d.studenId || d.studentId || null,
    student_class: d.studentClass || '',
    catatan: d.catatan || '',
    score: typeof d.score === 'number' ? d.score : 0,
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 7. Answers
  await syncCollection('answers', 'answers', (id, d) => ({
    id,
    assessment_id: d.assessmentId || null,
    criteria_id: d.criteriaId || null,
    average_point: typeof d.averagePoint === 'number' ? d.averagePoint : 0,
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 8. Answer Details
  await syncCollection('answer_details', 'answerDetails', (id, d) => ({
    id,
    answer_id: d.answerId || null,
    question_id: d.questionId || null,
    point: typeof d.point === 'number' ? d.point : 1,
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  // 9. Teacher Attendances
  await syncCollection('teacher_attendances', 'teacherAttendances', (id, d) => ({
    id,
    teacher_id: d.teacherId || null,
    teacher_name: d.teacherName || '',
    date: d.date || '',
    status: d.status || 'present',
    note: d.note || '',
    is_verified: Boolean(d.isVerified),
    verified_by: d.verifiedBy || null,
    verified_by_name: d.verifiedByName || null,
    verified_at: d.verifiedAt ? toIsoDate(d.verifiedAt) : null,
    created_at: toIsoDate(d.createdAt),
    updated_at: toIsoDate(d.updatedAt),
  }));

  console.log('\n=== SINKRONISASI SELESAI DENGAN SUKSES ===');
}

runMigration().catch((err) => {
  console.error('Fatal error saat migrasi:', err);
  process.exit(1);
});
