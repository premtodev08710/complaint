// auth.js
if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
db.settings({ experimentalAutoDetectLongPolling: true, useFetchStreams: false });

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMsg = document.getElementById('authMsg');

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('border-blue-600');
  tabRegister.classList.remove('border-blue-600');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  authMsg.textContent = '';
});
tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('border-blue-600');
  tabLogin.classList.remove('border-blue-600');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  authMsg.textContent = '';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); authMsg.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try { await auth.signInWithEmailAndPassword(email, password); window.location.href = './index.html'; }
  catch (err) { authMsg.textContent = err.message || 'เข้าสู่ระบบไม่สำเร็จ'; }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault(); authMsg.textContent = '';
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      email, fullName: '', phone: '', department: '', role: 'user',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.location.href = './profile.html';
  } catch (err) { authMsg.textContent = err.message || 'สมัครสมาชิกไม่สำเร็จ'; }
});
