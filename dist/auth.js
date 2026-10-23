import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
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
  if (loginButton) {
    loginButton.disabled = busy;
    loginButton.classList.toggle('loading', busy);
  }
  if (message && status) status.textContent = message;
}

function showUser(user) {
  document.body.classList.remove('auth-pending');
  document.body.classList.add('auth-signed-in');
  document.querySelector('#authName').textContent = user.displayName || 'Membru al echipei';
  document.querySelector('#authEmail').textContent = user.email || 'cont Google';
  const avatar = document.querySelector('#authAvatar');
  avatar.src = user.photoURL || './assets/icon.svg';
  avatar.alt = user.displayName ? `Fotografia lui ${user.displayName}` : 'Fotografie profil';
  setBusy(false, '');
}

function showLogin(message = 'Conectare securizată prin Firebase') {
  document.body.classList.remove('auth-signed-in');
  document.body.classList.add('auth-pending');
  setBusy(false, message);
}

function friendlyError(error) {
  const messages = {
    'auth/popup-closed-by-user': 'Conectarea Google a fost închisă înainte de finalizare.',
    'auth/cancelled-popup-request': 'Conectarea a fost anulată. Încearcă din nou.',
    'auth/popup-blocked': 'Browserul a blocat fereastra Google. Deschide aplicația direct în Safari și încearcă din nou.',
    'auth/account-exists-with-different-credential': 'Acest e-mail folosește deja altă metodă de conectare.',
    'auth/unauthorized-domain': 'Domeniul aplicației nu este autorizat în Firebase.',
    'auth/network-request-failed': 'Nu există conexiune la internet. Încearcă din nou.',
    'auth/operation-not-supported-in-this-environment': 'Acest browser nu permite conectarea Google. Deschide aplicația direct în Safari.'
  };

  if (messages[error?.code]) return messages[error.code];
  return `Conectarea nu a reușit${error?.code ? ` (${error.code})` : ''}. Încearcă din nou.`;
}

async function loginWithGoogle() {
  setBusy(true, 'Se deschide Google…');

  try {
    // Firebase recommends popup auth for apps hosted outside Firebase Hosting
    // on browsers that partition third-party storage (Safari 16.1+, Firefox,
    // modern Chrome). It avoids the fragile redirect-result round trip.
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);

    if (result?.user) {
      showUser(result.user);
    } else {
      showLogin('Conectarea Google nu s-a finalizat. Încearcă din nou.');
    }
  } catch (error) {
    console.error('Firebase Google sign-in failed:', error);
    showLogin(friendlyError(error));
  }
}

loginButton?.addEventListener('click', loginWithGoogle);

logoutButton?.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await signOut(auth);
  } finally {
    logoutButton.disabled = false;
  }
});

onAuthStateChanged(auth, user => {
  if (user) showUser(user);
  else showLogin();
});
