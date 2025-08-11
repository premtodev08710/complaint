// profile.js
if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });

const mustLogin = document.getElementById('mustLogin');
const form = document.getElementById('profileForm');
const emailEl = document.getElementById('email');
const fullNameEl = document.getElementById('fullName');
const phoneEl = document.getElementById('phone');
const departmentEl = document.getElementById('department');
const msg = document.getElementById('msg');

auth.onAuthStateChanged(async (user) => {
  if (!user) { mustLogin.classList.remove('hidden'); form.classList.add('hidden'); return; }
  mustLogin.classList.add('hidden'); form.classList.remove('hidden'); emailEl.value = user.email || '';
  const snap = await db.collection('users').doc(user.uid).get();
  if (snap.exists) {
    const p = snap.data() || {};
    fullNameEl.value = p.fullName || '';
    phoneEl.value = p.phone || '';
    departmentEl.value = p.department || '';
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault(); msg.textContent = '';
  const user = auth.currentUser; if (!user) return;
  const payload = {
    email: user.email || '',
    fullName: fullNameEl.value.trim(),
    phone: phoneEl.value.trim(),
    department: departmentEl.value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (!payload.fullName || !payload.phone || !payload.department) {
    msg.textContent = 'กรุณากรอกข้อมูลให้ครบ'; msg.className = 'text-sm text-red-600'; return;
  }
  try { await db.collection('users').doc(user.uid).set(payload, { merge: true }); msg.textContent = 'บันทึกเรียบร้อย'; msg.className = 'text-sm text-green-600'; }
  catch (err) { console.error(err); msg.textContent = 'บันทึกไม่สำเร็จ'; msg.className = 'text-sm text-red-600'; }
});
