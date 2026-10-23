import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAWQyx5kCjePwxhDTUiMSmFsU_XgbP4RFU',
  authDomain: 'paharul-intarzierilor-auth.firebaseapp.com',
  projectId: 'paharul-intarzierilor-auth',
  storageBucket: 'paharul-intarzierilor-auth.firebasestorage.app',
  messagingSenderId: '841390291456',
  appId: '1:841390291456:web:1f55f349177ee771ffb6e5'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const logoutButton = document.querySelector('#logoutButton');

function enterApp(user = null) {
  document.body.classList.remove('auth-pending');
  document.body.classList.add('auth-signed-in');

  const name = document.querySelector('#authName');
  const email = document.querySelector('#authEmail');
  const avatar = document.querySelector('#authAvatar');

  if (user) {
    name.textContent = user.displayName || 'Membru al echipei';
    email.textContent = user.email || 'cont Google';
    avatar.src = user.photoURL || './assets/icon.svg';
    avatar.alt = user.displayName ? `Fotografia lui ${user.displayName}` : 'Fotografie profil';
    if (logoutButton) logoutButton.hidden = false;
  } else {
    name.textContent = 'Mod local';
    email.textContent = 'date pe acest dispozitiv';
    avatar.src = './assets/icon.svg';
    avatar.alt = 'Halba întârzierilor';
    if (logoutButton) logoutButton.hidden = true;
  }
}

onAuthStateChanged(auth, user => {
  // Login is intentionally optional for the current local-only release.
  // This avoids iOS PWA popup/redirect loops and lets the app open instantly.
  enterApp(user || null);
}, () => {
  // Firebase availability must never block the local app.
  enterApp(null);
});

logoutButton?.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } finally {
    enterApp(null);
  }
});

// Safety fallback: never leave the PWA stuck on the auth screen.
setTimeout(() => {
  if (document.body.classList.contains('auth-pending')) enterApp(null);
}, 1200);
