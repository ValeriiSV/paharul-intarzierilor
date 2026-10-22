import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
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
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
auth.useDeviceLanguage();

const loginButton = document.querySelector('#googleSignIn');
const logoutButton = document.querySelector('#logoutButton');
const status = document.querySelector('#authStatus');

function setBusy(busy, message = '') {
  loginButton.disabled = busy;
  loginButton.classList.toggle('loading', busy);
  if (message) status.textContent = message;
}

function showUser(user) {
  document.body.classList.remove('auth-pending');
  document.body.classList.add('auth-signed-in');
  document.querySelector('#authName').textContent = user.displayName || 'Membru al echipei';
  document.querySelector('#authEmail').textContent = user.email || 'cont Google';
  const avatar = document.querySelector('#authAvatar');
  avatar.src = user.photoURL || './assets/icon.svg';
  avatar.alt = user.displayName ? `Fotografia lui ${user.displayName}` : 'Fotografie profil';
}

function showLogin(message = 'Conectare securizată prin Firebase') {
  document.body.classList.remove('auth-signed-in');
  document.body.classList.add('auth-pending');
  setBusy(false, message);
}

function friendlyError(error) {
  const messages = {
    'auth/popup-closed-by-user': 'Fereastra Google a fost închisă.',
    'auth/cancelled-popup-request': 'Conectarea a fost anulată.',
    'auth/account-exists-with-different-credential': 'Acest e-mail folosește deja altă metodă de conectare.',
    'auth/unauthorized-domain': 'Domeniul aplicației nu este încă autorizat în Firebase.',
    'auth/network-request-failed': 'Nu există conexiune la internet. Încearcă din nou.'
  };
  return messages[error?.code] || 'Conectarea nu a reușit. Încearcă din nou.';
}

loginButton.addEventListener('click', async () => {
  setBusy(true, 'Se deschide contul Google…');
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      return;
    }
    showLogin(friendlyError(error));
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try { await signOut(auth); }
  finally { logoutButton.disabled = false; }
});

onAuthStateChanged(auth, user => {
  if (user) showUser(user);
  else showLogin();
});

getRedirectResult(auth).catch(error => showLogin(friendlyError(error)));
