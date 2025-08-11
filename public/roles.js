// roles.js (Thai role labels)
if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });

// DOM
const adminBadge = document.getElementById('adminBadge');
const adminBadgeMobile = document.getElementById('adminBadgeMobile');
const guard = document.getElementById('guard');
const qEmail = document.getElementById('qEmail');
const fRole = document.getElementById('fRole');
const pageSizeEl = document.getElementById('pageSize');
const btnSearch = document.getElementById('btnSearch');
const btnReset = document.getElementById('btnReset');
const rows = document.getElementById('rows');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const hint = document.getElementById('hint');

// บทบาท (ค่า value เดิม + ป้ายภาษาไทย)
const ROLE_OPTIONS = [
  { value: 'user', label: 'ผู้ใช้ทั่วไป' },
  { value: 'rector', label: 'อธิการบดี' },
  { value: 'board-chairman', label: 'ประธานกรรมการมหาวิทยาลัย' },
  { value: 'vice-rector', label: 'รองอธิการบดี' },
  { value: 'university-council', label: 'สภามหาวิทยาลัย' },
  { value: 'admin', label: 'ผู้ดูแลระบบ' }
];
const ROLE_VALUES = ROLE_OPTIONS.map(o => o.value);

function roleLabel(v) {
  return (ROLE_OPTIONS.find(o => o.value === v) || {}).label || v || 'ผู้ใช้ทั่วไป';
}

// Pager state
let pageSize = 50;
let lastSnapshot = null;
let cursors = [];

// Utils
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function escapeAttr(s){return String(s||'').replace(/"/g,'&quot;');}
function showToast(msg, type='success'){
  const id = 't'+Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = `px-4 py-3 rounded-lg text-white shadow ${type==='success'?'bg-emerald-600':'bg-rose-600'}`;
  el.innerText = msg;
  document.getElementById('toastWrap').appendChild(el);
  setTimeout(()=>{ el.classList.add('opacity-0'); el.classList.add('transition'); }, 2200);
  setTimeout(()=> el.remove(), 2700);
}
function roleBadge(role){
  const color = {
    admin: 'bg-purple-100 text-purple-700',
    'board-chairman': 'bg-amber-100 text-amber-800',
    rector: 'bg-sky-100 text-sky-700',
    'vice-rector': 'bg-indigo-100 text-indigo-700',
    'university-council': 'bg-teal-100 text-teal-700',
    user: 'bg-gray-100 text-gray-700'
  }[role] || 'bg-gray-100 text-gray-700';
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}">
            <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>${escapeHtml(roleLabel(role))}
          </span>`;
}
function initialsFromEmail(email='?'){
  const base = email.split('@')[0] || '?';
  return base.slice(0,2).toUpperCase();
}
function skeletonRows(n=6){
  rows.innerHTML = Array.from({length:n}).map(()=>`
    <tr>
      <td class="px-5 py-4"><div class="h-4 w-48 bg-slate-200 rounded animate-pulse"></div></td>
      <td class="px-5 py-4"><div class="h-4 w-40 bg-slate-200 rounded animate-pulse"></div></td>
      <td class="px-5 py-4"><div class="h-4 w-28 bg-slate-200 rounded animate-pulse"></div></td>
      <td class="px-5 py-4"><div class="h-4 w-40 bg-slate-200 rounded animate-pulse"></div></td>
      <td class="px-5 py-4"><div class="h-6 w-28 bg-slate-200 rounded-full animate-pulse"></div></td>
      <td class="px-5 py-4"><div class="h-8 w-32 bg-slate-200 rounded animate-pulse"></div></td>
    </tr>
  `).join('');
}

// Auth gate
auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = './auth.html'; return; }
  try {
    const prof = await db.collection('users').doc(user.uid).get();
    const myRole = prof.exists ? (prof.data().role || 'user') : 'user';
    if (myRole !== 'admin') {
      guard.classList.remove('hidden');
      adminBadge?.classList.add('hidden');
      adminBadgeMobile?.classList.add('hidden');
      return;
    }
    const label = `เข้าสู่ระบบ: ${user.email} (${roleLabel('admin')})`;
    adminBadge && (adminBadge.textContent = label, adminBadge.classList.remove('hidden'));
    adminBadgeMobile && (adminBadgeMobile.textContent = label, adminBadgeMobile.classList.remove('hidden'));
    await runSearch(true);
  } catch (e) {
    console.error('โหลดบทบาทล้มเหลว', e);
    guard.classList.remove('hidden');
  }
});

// Events
btnSearch.addEventListener('click', () => runSearch(true));
btnReset.addEventListener('click', () => { qEmail.value=''; fRole.value=''; pageSizeEl.value='50'; runSearch(true); });
pageSizeEl.addEventListener('change', () => runSearch(true));
prevBtn.addEventListener('click', goPrev);
nextBtn.addEventListener('click', goNext);

// Core search (order by email by default)
async function runSearch(reset) {
  if (reset) { pageSize = parseInt(pageSizeEl.value, 10) || 50; lastSnapshot = null; cursors = []; }
  skeletonRows();

  try {
    const base = db.collection('users');
    const emailKey = qEmail.value.trim().toLowerCase();
    let q;

    if (emailKey) {
      q = base.orderBy('email').startAt(emailKey).endAt(emailKey + '\uf8ff').limit(pageSize);
    } else {
      q = base.orderBy('email').limit(pageSize);
    }

    if (lastSnapshot && lastSnapshot.docs.length) {
      const last = lastSnapshot.docs[lastSnapshot.docs.length - 1];
      q = q.startAfter(last);
    }

    const snap = await q.get();
    lastSnapshot = snap;

    if (snap.empty) {
      rows.innerHTML = `
        <tr>
          <td class="px-5 py-8 text-center text-slate-500" colspan="6">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">🔍</div>
            ไม่พบข้อมูลที่ตรงกับเงื่อนไข
          </td>
        </tr>`;
      prevBtn.disabled = cursors.length === 0;
      nextBtn.disabled = true;
      hint.textContent = '';
      return;
    }

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const roleFilter = fRole.value;
    const filtered = roleFilter ? items.filter(i => (i.role || 'user') === roleFilter) : items;

    rows.innerHTML = filtered.map(renderRow).join('');

    // bind actions
    document.querySelectorAll('[data-action="save"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const uid = e.currentTarget.dataset.id;
        await saveUser(uid);
      });
    });
    document.querySelectorAll('[data-action="resetPwd"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const email = e.currentTarget.dataset.email;
        await resetPassword(email);
      });
    });

    prevBtn.disabled = cursors.length === 0;
    nextBtn.disabled = snap.size < pageSize;
    hint.textContent = `แสดง ${filtered.length} รายการ (ดึงมาจริง ${items.length})`;

    // push cursor
    const first = snap.docs[0];
    const last = snap.docs[snap.docs.length - 1];
    cursors.push({ first, last });

  } catch (err) {
    console.error(err);
    rows.innerHTML = `<tr><td class="px-5 py-6 text-red-600" colspan="6">${(err.code||'')} ${(err.message||'โหลดข้อมูลล้มเหลว')}</td></tr>`;
  }
}

async function goNext() { if (!nextBtn.disabled) await runSearch(false); }

async function goPrev() {
  if (cursors.length <= 1) return;
  cursors.pop();
  const top = cursors[cursors.length - 1];
  skeletonRows();

  try {
    const base = db.collection('users');
    const emailKey = qEmail.value.trim().toLowerCase();
    let q;

    if (emailKey) q = base.orderBy('email').endBefore(top.first).limitToLast(pageSize);
    else q = base.orderBy('email').endBefore(top.first).limitToLast(pageSize);

    const snap = await q.get();
    lastSnapshot = snap;

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const roleFilter = fRole.value;
    const filtered = roleFilter ? items.filter(i => (i.role || 'user') === roleFilter) : items;

    rows.innerHTML = filtered.map(renderRow).join('');

    // bind actions
    document.querySelectorAll('[data-action="save"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const uid = e.currentTarget.dataset.id;
        await saveUser(uid);
      });
    });
    document.querySelectorAll('[data-action="resetPwd"]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const email = e.currentTarget.dataset.email;
        await resetPassword(email);
      });
    });

    prevBtn.disabled = cursors.length <= 1;
    nextBtn.disabled = snap.size < pageSize;
    hint.textContent = `แสดง ${filtered.length} รายการ (ดึงมาจริง ${items.length})`;
  } catch (err) {
    console.error(err);
    rows.innerHTML = `<tr><td class="px-5 py-6 text-red-600" colspan="6">${(err.code||'')} ${(err.message||'โหลดข้อมูลล้มเหลว')}</td></tr>`;
  }
}

// Render row
function renderRow(u) {
  const role = (u.role || 'user');
  const email = u.email || '';
  const initials = initialsFromEmail(email);
  return `
    <tr class="hover:bg-slate-50 align-top">
      <td class="px-5 py-4">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-sm font-semibold">
            ${escapeHtml(initials)}
          </div>
          <div>
            <div class="font-medium text-slate-900">${escapeHtml(email)}</div>
            <div class="text-xs text-slate-500">uid: ${u.id}</div>
          </div>
        </div>
      </td>
      <td class="px-5 py-4">
        <input id="fullName-${u.id}" class="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${escapeAttr(u.fullName || '')}">
      </td>
      <td class="px-5 py-4">
        <input id="phone-${u.id}" class="border border-gray-300 rounded-lg px-3 py-2 w-40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${escapeAttr(u.phone || '')}">
      </td>
      <td class="px-5 py-4">
        <input id="department-${u.id}" class="border border-gray-300 rounded-lg px-3 py-2 w-60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
               value="${escapeAttr(u.department || '')}">
      </td>
      <td class="px-5 py-4">
        <div class="flex items-center gap-2">
          <select id="role-${u.id}" class="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            ${ROLE_OPTIONS.map(o => `<option value="${o.value}" ${o.value===role?'selected':''}>${o.label}</option>`).join('')}
          </select>
         
        </div>
      </td>
      <td class="px-5 py-4">
        <div class="flex flex-wrap gap-2">
          <button data-action="save" data-id="${u.id}" class="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90">บันทึก</button>
          <button data-action="resetPwd" data-email="${escapeAttr(email)}" class="px-3 py-2 rounded-lg border hover:bg-slate-50">รีเซ็ตรหัสผ่าน</button>
        </div>
      </td>
    </tr>
  `;
}

// Actions
async function saveUser(uid) {
  try {
    const payload = {
      fullName: document.getElementById(`fullName-${uid}`).value.trim(),
      phone: document.getElementById(`phone-${uid}`).value.trim(),
      department: document.getElementById(`department-${uid}`).value.trim(),
      role: document.getElementById(`role-${uid}`).value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!ROLE_VALUES.includes(payload.role)) { showToast('บทบาทไม่ถูกต้อง','error'); return; }
    await db.collection('users').doc(uid).set(payload, { merge: true });
    showToast('บันทึกสำเร็จ');
  } catch (err) {
    console.error(err);
    showToast('บันทึกไม่สำเร็จ ตรวจสอบสิทธิ์/Rules','error');
  }
}

async function resetPassword(email) {
  if (!email) return showToast('ไม่พบอีเมลผู้ใช้','error');
  if (!confirm(`ส่งอีเมลรีเซ็ตรหัสไปที่ ${email}?`)) return;
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว');
  } catch (err) {
    console.error(err);
    showToast('ส่งอีเมลไม่สำเร็จ','error');
  }
}

async function logout(){ await auth.signOut(); window.location.href = './auth.html'; }
