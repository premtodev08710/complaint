if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });

const rows = document.getElementById('rows');
const guard = document.getElementById('guard');
const adminBadge = document.getElementById('adminBadge');
const statusFilter = document.getElementById('statusFilter');
const sortDir = document.getElementById('sortDir');
const refreshBtn = document.getElementById('refreshBtn');
const scopeInfo = document.getElementById('scopeInfo');
const membersLink = document.getElementById('membersLink');

const ROLE_LIST = ['admin','rector','board-chairman','vice-rector','university-council'];
const TARGET_MAP = {
  'rector': 'อธิการบดี',
  'board-chairman': 'ประธานกรรมการมหาวิทยาลัย',
  'vice-rector': 'รองอธิการบดี',
  'university-council': 'สภามหาวิทยาลัย'
};
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function asDate(v){ return v && v.toDate ? v.toDate() : new Date(v); }

let currentRole = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = './auth.html'; return; }

  const prof = await db.collection('users').doc(user.uid).get();
  currentRole = prof.exists ? (prof.data().role || 'user') : 'user';
  if (!ROLE_LIST.includes(currentRole)) {
    guard.classList.remove('hidden'); adminBadge.classList.add('hidden'); rows.innerHTML = ''; return;
  }

  adminBadge.textContent = `เข้าสู่ระบบ: ${user.email} (${currentRole})`;
  adminBadge.classList.remove('hidden');
  if (currentRole === 'admin') membersLink.classList.remove('hidden'); else membersLink.classList.add('hidden');

  scopeInfo.textContent = currentRole === 'admin'
    ? 'ขอบเขต: เห็นทุกเรื่อง'
    : `ขอบเขต: เฉพาะเรื่องที่ส่งถึง "${TARGET_MAP[currentRole] ?? currentRole}"`;

  await loadTable();
});

refreshBtn.addEventListener('click', loadTable);
statusFilter.addEventListener('change', loadTable);
sortDir.addEventListener('change', loadTable);

async function loadTable() {
  rows.innerHTML = '<tr><td class="px-4 py-3 text-slate-500" colspan="6">กำลังโหลด...</td></tr>';
  try {
    let q = db.collection('complaints');
    if (currentRole !== 'admin') q = q.where('targetLevel','==', currentRole);
    const sf = statusFilter.value; if (sf) q = q.where('status','==', sf);
    q = q.orderBy('createdAt', sortDir.value === 'asc' ? 'asc' : 'desc');

    const snap = await q.get();
    if (snap.empty) { rows.innerHTML = '<tr><td class="px-4 py-3 text-slate-500" colspan="6">ไม่มีข้อมูล</td></tr>'; return; }

    let html = '';
    snap.forEach(doc => { html += renderRow(doc.id, doc.data()); });
    rows.innerHTML = html;

    document.querySelectorAll('[data-action="setStatus"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.dataset.id;
        const to = e.currentTarget.dataset.to;
        await setStatus(id, to);
      });
    });
  } catch (err) {
    console.error(err);
    document.getElementById('hintIndex').classList.remove('hidden');
    rows.innerHTML = `<tr><td class="px-4 py-3 text-red-600" colspan="6">${(err.code||'')} ${(err.message||'โหลดข้อมูลล้มเหลว')}</td></tr>`;
  }
}

function renderRow(id, c) {
  const stText = {pending:'รอดำเนินการ',processing:'กำลังดำเนินการ',resolved:'แก้ไขแล้ว'};
  const levelTh = TARGET_MAP[c.targetLevel] || c.targetLevel;
  const dateTh = asDate(c.createdAt).toLocaleString('th-TH');
  const btns =
    `<div class="flex gap-2">
      <button data-action="setStatus" data-id="${id}" data-to="pending" class="px-3 py-1 rounded bg-amber-100 text-amber-800">pending</button>
      <button data-action="setStatus" data-id="${id}" data-to="processing" class="px-3 py-1 rounded bg-blue-100 text-blue-800">processing</button>
      <button data-action="setStatus" data-id="${id}" data-to="resolved" class="px-3 py-1 rounded bg-green-100 text-green-800">resolved</button>
    </div>`;
  return `
    <tr class="hover:bg-slate-50 align-top">
      <td class="px-4 py-3 whitespace-nowrap">${dateTh}</td>
      <td class="px-4 py-3">
        <div class="font-semibold">${escapeHtml(c.subject)}</div>
        <div class="text-sm text-slate-600 whitespace-pre-wrap">${escapeHtml((c.description||'').slice(0,200))}${(c.description||'').length>200?'...':''}</div>
        <div class="text-xs text-slate-500 mt-1">หมายเลขติดตาม: ${c.trackingId}</div>
      </td>
      <td class="px-4 py-3">${levelTh}</td>
      <td class="px-4 py-3">${stText[c.status] || c.status}</td>
      <td class="px-4 py-3">
        <div class="text-sm">
          <div class="font-medium">${escapeHtml(c.fullName || '(ไม่ระบุ)')}</div>
          <div class="text-slate-600">${escapeHtml(c.userEmail || '')}</div>
          <div class="text-slate-600">${escapeHtml(c.phone || '')}</div>
          <div class="text-slate-600">${escapeHtml(c.department || '')}</div>
        </div>
      </td>
      <td class="px-4 py-3">${btns}</td>
    </tr>`;
}

async function setStatus(id, to) {
  try {
    await db.collection('complaints').doc(id).update({
      status: to,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadTable();
  } catch (err) {
    console.error(err);
    alert('อัปเดตสถานะไม่สำเร็จ (ตรวจ Rules/สิทธิ์)');
  }
}
async function logout(){ await auth.signOut(); window.location.href = './auth.html'; }
