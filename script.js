// script.js
// --------------------- Firebase Init ---------------------
if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
// กันปัญหา CORS/เครือข่ายเข้มงวด
db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });

// --------------------- Helpers ---------------------
function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function asDate(v){ try{return v && typeof v.toDate==='function' ? v.toDate() : new Date(v);}catch{return new Date();} }
function getComplaintTypeText(type) {
  const t = {
    academic:'เรื่องวิชาการ',
    administration:'เรื่องการบริหาร',
    facility:'เรื่องสิ่งอำนวยความสะดวก',
    personnel:'เรื่องบุคลากร',
    'student-affairs':'เรื่องกิจการนักศึกษา',
    other:'อื่นๆ'
  };
  return t[type] || type;
}

// --------------------- Navigation ---------------------
function showSection(section) {
  const sections = ['homeSection', 'complaintSection', 'statusSection'];
  sections.forEach(s => document.getElementById(s)?.classList.add('hidden'));
  document.getElementById(section + 'Section')?.classList.remove('hidden');

  if (section === 'status') prepareStatusSection(); // ← ใช้ตัวเตรียมแบบใหม่
  if (section === 'home') updateStatistics();
  if (section === 'complaint') prepareComplaintForm();
}

// --------------------- Auth State & Role-based Nav ---------------------
auth.onAuthStateChanged(async (user) => {
  const loginLink = document.getElementById('loginLink');
  const logoutBtn = document.getElementById('logoutBtn');
  const userBadge = document.getElementById('userBadge');
  const profileLink = document.getElementById('profileLink');
  const adminLink = document.getElementById('adminLink');

  const loginLinkMobile = document.getElementById('loginLinkMobile');
  const logoutBtnMobile = document.getElementById('logoutBtnMobile');
  const userBadgeMobile = document.getElementById('userBadgeMobile');
  const profileLinkMobile = document.getElementById('profileLinkMobile');
  const adminLinkMobile = document.getElementById('adminLinkMobile');

  if (user) {
    const label = `เข้าสู่ระบบ: ${user.email}`;
    userBadge?.classList.remove('hidden'); userBadge && (userBadge.textContent = label);
    loginLink?.classList.add('hidden'); logoutBtn?.classList.remove('hidden'); profileLink?.classList.remove('hidden');

    userBadgeMobile?.classList.remove('hidden'); userBadgeMobile && (userBadgeMobile.textContent = label);
    loginLinkMobile?.classList.add('hidden'); logoutBtnMobile?.classList.remove('hidden'); profileLinkMobile?.classList.remove('hidden');

    try {
      const prof = await db.collection('users').doc(user.uid).get();
      const role = prof.exists ? (prof.data().role || 'user') : 'user';
      const ADMIN_ROLES = ['admin','rector','board-chairman','vice-rector','university-council'];
      if (ADMIN_ROLES.includes(role)) { adminLink?.classList.remove('hidden'); adminLinkMobile?.classList.remove('hidden'); }
      else { adminLink?.classList.add('hidden'); adminLinkMobile?.classList.add('hidden'); }
    } catch (e) {
      console.error('โหลดบทบาทล้มเหลว:', e);
      adminLink?.classList.add('hidden'); adminLinkMobile?.classList.add('hidden');
    }
  } else {
    userBadge?.classList.add('hidden'); loginLink?.classList.remove('hidden'); logoutBtn?.classList.add('hidden');
    profileLink?.classList.add('hidden'); adminLink?.classList.add('hidden');

    userBadgeMobile?.classList.add('hidden'); loginLinkMobile?.classList.remove('hidden'); logoutBtnMobile?.classList.add('hidden');
    profileLinkMobile?.classList.add('hidden'); adminLinkMobile?.classList.add('hidden');
  }
});

// --------------------- Logout ---------------------
async function logout() { await auth.signOut(); showSection('home'); }

// --------------------- Prepare Complaint Form ---------------------
async function prepareComplaintForm() {
  const mustLogin = document.getElementById('mustLogin');
  const mustSetupProfile = document.getElementById('mustSetupProfile');
  const card = document.getElementById('complaintCard');

  const user = auth.currentUser;
  if (!user) { card?.classList.add('hidden'); mustSetupProfile?.classList.add('hidden'); mustLogin?.classList.remove('hidden'); return; }

  try {
    const snap = await db.collection('users').doc(user.uid).get();
    if (!snap.exists) { mustLogin?.classList.add('hidden'); card?.classList.add('hidden'); mustSetupProfile?.classList.remove('hidden'); return; }

    const p = snap.data() || {};
    const fullName = (p.fullName || '').trim();
    const phone = (p.phone || '').trim();
    const department = (p.department || '').trim();
    const ready = fullName && phone && department;

    if (!ready) { mustLogin?.classList.add('hidden'); card?.classList.add('hidden'); mustSetupProfile?.classList.remove('hidden'); return; }

    document.getElementById('email').value = user.email || '';
    document.getElementById('fullName').value = fullName;
    document.getElementById('phone').value = phone;
    document.getElementById('department').value = department;

    mustLogin?.classList.add('hidden'); mustSetupProfile?.classList.add('hidden'); card?.classList.remove('hidden');
  } catch (e) {
    console.error('โหลดโปรไฟล์ไม่สำเร็จ:', e);
    alert('โหลดโปรไฟล์ไม่สำเร็จ');
  }
}

// --------------------- Submit Complaint ---------------------
const complaintForm = document.getElementById('complaintForm');
if (complaintForm) {
  complaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('โปรดเข้าสู่ระบบ');

    const formData = {
      trackingId: 'CP' + Date.now(),
      userId: user.uid,
      userEmail: user.email || '',
      fullName: document.getElementById('fullName').value,
      phone: document.getElementById('phone').value,
      department: document.getElementById('department').value,
      userType: document.getElementById('userType').value,
      complaintType: document.getElementById('complaintType').value,
      targetLevel: document.getElementById('targetLevel').value,
      subject: document.getElementById('subject').value,
      description: document.getElementById('description').value,
      solution: document.getElementById('solution').value || '',
      anonymous: document.getElementById('anonymous').checked,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('complaints').add(formData);
      document.getElementById('trackingNumber').textContent = formData.trackingId;
      document.getElementById('successModal').classList.remove('hidden');
      complaintForm.reset();
      updateStatistics();
    } catch (err) {
      console.error(err);
      alert((err && (err.code || err.message)) ? `${err.code || ''} ${err.message || ''}` : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  });
}

// --------------------- Status section (ของฉันเท่านั้น) ---------------------
async function prepareStatusSection() {
  const mustLoginStatus = document.getElementById('mustLoginStatus');
  const resWrap = document.getElementById('statusResult');
  const wrap = document.getElementById('recentComplaints');

  const user = auth.currentUser;
  if (!user) {
    mustLoginStatus?.classList.remove('hidden');
    resWrap?.classList.add('hidden');
    if (wrap) wrap.innerHTML = `<div class="text-center py-8 text-gray-500">กรุณาเข้าสู่ระบบ</div>`;
    return;
  }

  mustLoginStatus?.classList.add('hidden');
  await loadMyRecentComplaints();
}

async function checkStatus() {
  const user = auth.currentUser;
  if (!user) return alert('โปรดเข้าสู่ระบบก่อนตรวจสอบสถานะ');

  const trackingId = document.getElementById('trackingId').value.trim();
  if (!trackingId) return alert('กรุณากรอกหมายเลขติดตาม');
  const resWrap = document.getElementById('statusResult');
  const content = document.getElementById('statusContent');
  if (!resWrap || !content) return;

  try {
    // ค้นหาเฉพาะคำร้องของ "ฉัน" เท่านั้น
    const qs = await db.collection('complaints')
      .where('userId','==', user.uid)
      .where('trackingId','==', trackingId)
      .limit(1)
      .get();

    if (qs.empty) {
      content.innerHTML = `
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span class="text-3xl">❌</span></div>
          <h4 class="text-xl font-bold">ไม่พบข้อมูล</h4>
          <p class="text-gray-600">หมายเลข "${escapeHtml(trackingId)}" (เฉพาะของบัญชีคุณเท่านั้น)</p>
        </div>`;
      resWrap.classList.remove('hidden'); return;
    }

    const c = qs.docs[0].data();
    const stText = {pending:'รอดำเนินการ',processing:'กำลังดำเนินการ',resolved:'แก้ไขแล้ว'};
    const stClass = {pending:'status-pending',processing:'status-processing',resolved:'status-resolved'};
    const created = asDate(c.createdAt).toLocaleDateString('th-TH');

    content.innerHTML = `
      <div class="border-l-4 border-blue-500 pl-6">
        <h4 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(c.subject)}</h4>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div><p class="text-sm text-gray-600">หมายเลขติดตาม</p><p class="font-semibold">${c.trackingId}</p></div>
          <div><p class="text-sm text-gray-600">สถานะ</p><span class="inline-block px-3 py-1 rounded-full text-sm font-medium ${stClass[c.status]}">${stText[c.status]}</span></div>
          <div><p class="text-sm text-gray-600">วันที่ยื่นเรื่อง</p><p class="font-semibold">${created}</p></div>
          <div><p class="text-sm text-gray-600">ประเภท</p><p class="font-semibold">${getComplaintTypeText(c.complaintType)}</p></div>
        </div>
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">รายละเอียด</p>
          <p class="text-gray-800 break-words whitespace-pre-wrap">${escapeHtml(c.description)}</p>
        </div>
        <div class="mt-4 text-sm text-gray-500 italic">ผู้ร้อง: (คุณ)</div>
      </div>`;
    resWrap.classList.remove('hidden');
  } catch(e){
    console.error('checkStatus error:', e);
    alert((e && (e.code || e.message)) ? `${e.code || ''} ${e.message || ''}` : 'ตรวจสอบสถานะไม่สำเร็จ');
  }
}

// ----- My recent complaints -----
async function loadMyRecentComplaints() {
  const wrap = document.getElementById('recentComplaints'); if (!wrap) return;
  const user = auth.currentUser;
  if (!user) { wrap.innerHTML = `<div class="text-center py-8 text-gray-500">กรุณาเข้าสู่ระบบ</div>`; return; }

  try {
    // ต้องมี index: userId ASC + createdAt DESC
    const qs = await db.collection('complaints')
      .where('userId','==', user.uid)
      .orderBy('createdAt','desc')
      .limit(5)
      .get();

    if (qs.empty) { wrap.innerHTML = `<div class="text-center py-8 text-gray-500">ยังไม่มีเรื่องร้องเรียนของคุณ</div>`; return; }

    const stText = {pending:'รอดำเนินการ',processing:'กำลังดำเนินการ',resolved:'แก้ไขแล้ว'};
    const stClass = {pending:'status-pending',processing:'status-processing',resolved:'status-resolved'};
    wrap.innerHTML = qs.docs.map(d=>{
      const c=d.data(); const date = asDate(c.createdAt).toLocaleDateString('th-TH');
      return `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div class="flex justify-between items-start mb-2">
            <h5 class="font-semibold text-gray-800">${escapeHtml(c.subject)}</h5>
            <span class="inline-block px-2 py-1 rounded-full text-xs font-medium ${stClass[c.status]}">${stText[c.status]}</span>
          </div>
          <p class="text-sm text-gray-600 mb-2">${escapeHtml((c.description||'').substring(0,100))}...</p>
          <div class="flex justify-between items-center text-xs text-gray-500">
            <span>หมายเลข: ${c.trackingId}</span>
            <span>${date}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch(e){
    console.error('loadMyRecentComplaints error:', e);
    const msg = (e && (e.code || e.message)) ? `${e.code || ''} ${e.message || ''}` : 'ดึงข้อมูลล้มเหลว';
    wrap.innerHTML = `<div class="text-center py-8 text-red-500">${msg}</div>`;
  }
}

// --------------------- Statistics (4 ช่อง) ---------------------
async function updateStatistics() {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  try {
    const snap = await db.collection('complaints').get();
    let total = snap.size;
    let pending = 0, processing = 0, resolved = 0;

    snap.forEach(doc => {
      const s = (doc.data().status || '').toLowerCase();
      if (s === 'pending') pending++;
      else if (s === 'processing') processing++;
      else if (s === 'resolved') resolved++;
    });

    setText('totalComplaints', total);
    setText('pendingComplaints', pending);
    setText('processingComplaints', processing);
    setText('resolvedComplaints', resolved); // ดำเนินการเสร็จสิ้น
  } catch (e) {
    console.error('updateStatistics error:', e);
    setText('totalComplaints', 0);
    setText('pendingComplaints', 0);
    setText('processingComplaints', 0);
    setText('resolvedComplaints', 0);
  }
}

// --------------------- Modal ---------------------
function closeModal() { document.getElementById('successModal')?.classList.add('hidden'); }
document.getElementById('successModal')?.addEventListener('click', (e)=>{ if (e.target === e.currentTarget) closeModal(); });

// --------------------- Init ---------------------
document.addEventListener('DOMContentLoaded', () => { updateStatistics(); showSection('home'); });

// expose to window (ใช้กับ onclick ใน HTML)
window.toggleMobileMenu = toggleMobileMenu;
window.showSection = showSection;
window.checkStatus = checkStatus;
window.logout = logout;
window.closeModal = closeModal;
