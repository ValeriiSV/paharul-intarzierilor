import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, browserLocalPersistence, getRedirectResult,
  onAuthStateChanged, setPersistence, signInWithPopup, signInWithRedirect, signOut
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  getFirestore, addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  onSnapshot, query, serverTimestamp, setDoc, updateDoc, where
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
auth.useDeviceLanguage();

const loginButton = document.querySelector('#googleSignIn');
const logoutButton = document.querySelector('#logoutButton');
const status = document.querySelector('#authStatus');

function cleanCode(value=''){return value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);}
function makeCode(){return Math.random().toString(36).slice(2,8).toUpperCase();}
function profile(user,extra={}){return {uid:user.uid,displayName:user.displayName||user.email?.split('@')[0]||'Membru',email:user.email||'',photoURL:user.photoURL||'',...extra};}

const cloud = {
  async getUserProfile(uid){const snap=await getDoc(doc(db,'users',uid));return snap.exists()?snap.data():null;},

  async createTeam(user,name){
    const teamRef=doc(collection(db,'teams'));
    const code=makeCode();
    await setDoc(teamRef,{name:name.trim()||'Echipa mea',inviteCode:code,createdBy:user.uid,goalMinutes:60,createdAt:serverTimestamp()});
    await setDoc(doc(db,'teams',teamRef.id,'members',user.uid),profile(user,{role:'admin',joinedAt:serverTimestamp(),inviteCode:'OWNER'}));
    await addDoc(collection(db,'teams',teamRef.id,'participants'),{name:profile(user).displayName,linkedUid:user.uid,active:true,createdAt:serverTimestamp()});
    await setDoc(doc(db,'invites',code),{teamId:teamRef.id,teamName:name.trim()||'Echipa mea',ownerUid:user.uid,active:true,createdAt:serverTimestamp()});
    await setDoc(doc(db,'users',user.uid),profile(user,{activeTeamId:teamRef.id,updatedAt:serverTimestamp()}),{merge:true});
    return {teamId:teamRef.id,code};
  },

  async joinTeam(user,rawCode){
    const code=cleanCode(rawCode);if(!code)throw new Error('Codul lipsește.');
    const inviteSnap=await getDoc(doc(db,'invites',code));
    if(!inviteSnap.exists()||inviteSnap.data().active===false)throw new Error('Linkul sau codul nu este valid.');
    const invite=inviteSnap.data();
    const memberRef=doc(db,'teams',invite.teamId,'members',user.uid);
    const memberSnap=await getDoc(memberRef);
    if(!memberSnap.exists())await setDoc(memberRef,profile(user,{role:'member',joinedAt:serverTimestamp(),inviteCode:code}));
    const participantsRef=collection(db,'teams',invite.teamId,'participants');
    const existing=await getDocs(query(participantsRef,where('linkedUid','==',user.uid)));
    if(existing.empty)await addDoc(participantsRef,{name:profile(user).displayName,linkedUid:user.uid,active:true,createdAt:serverTimestamp()});
    await setDoc(doc(db,'users',user.uid),profile(user,{activeTeamId:invite.teamId,updatedAt:serverTimestamp()}),{merge:true});
    return {teamId:invite.teamId,code};
  },

  subscribeTeam(teamId,userId,handlers){
    const errors=handlers.error||(()=>{});
    return [
      onSnapshot(doc(db,'teams',teamId),snap=>handlers.team?.(snap.exists()?{id:snap.id,...snap.data()}:null),errors),
      onSnapshot(doc(db,'teams',teamId,'members',userId),snap=>handlers.member?.(snap.exists()?snap.data():null),errors),
      onSnapshot(collection(db,'teams',teamId,'participants'),snap=>handlers.participants?.(snap.docs.map(d=>({id:d.id,...d.data()}))),errors),
      onSnapshot(collection(db,'teams',teamId,'entries'),snap=>handlers.entries?.(snap.docs.map(d=>({id:d.id,...d.data()}))),errors)
    ];
  },

  async addParticipant(teamId,name){return addDoc(collection(db,'teams',teamId,'participants'),{name:name.trim(),linkedUid:null,active:true,createdAt:serverTimestamp()});},
  async setParticipantActive(teamId,id,active){return updateDoc(doc(db,'teams',teamId,'participants',id),{active,updatedAt:serverTimestamp()});},
  async saveEntry(teamId,item,id){
    const data={...item,updatedAt:serverTimestamp()};
    if(id){await updateDoc(doc(db,'teams',teamId,'entries',id),data);return id;}
    const ref=await addDoc(collection(db,'teams',teamId,'entries'),{...data,createdBy:auth.currentUser.uid,createdByName:auth.currentUser.displayName||auth.currentUser.email,status:'pending',reactions:{},createdAt:serverTimestamp()});return ref.id;
  },
  async deleteEntry(teamId,id){return deleteDoc(doc(db,'teams',teamId,'entries',id));},
  async setEntryStatus(teamId,id,status){return updateDoc(doc(db,'teams',teamId,'entries',id),{status,statusUpdatedBy:auth.currentUser.uid,statusUpdatedAt:serverTimestamp()});},
  async react(teamId,id,emoji){return updateDoc(doc(db,'teams',teamId,'entries',id),{[`reactions.${auth.currentUser.uid}`]:emoji,updatedAt:serverTimestamp()});},

  async importLegacy(teamId,legacy){
    if(!legacy?.entries?.length)return 0;
    const participantsRef=collection(db,'teams',teamId,'participants');
    const existing=await getDocs(participantsRef);const byName=new Map(existing.docs.map(d=>[d.data().name.toLocaleLowerCase('ro'),d.id]));
    const names=[...new Set(legacy.entries.flatMap(e=>[e.waiter,e.latePerson]).filter(Boolean))];
    for(const name of names){if(!byName.has(name.toLocaleLowerCase('ro'))){const ref=await addDoc(participantsRef,{name,linkedUid:null,active:true,createdAt:serverTimestamp()});byName.set(name.toLocaleLowerCase('ro'),ref.id);}}
    for(const entry of legacy.entries){await addDoc(collection(db,'teams',teamId,'entries'),{waiterId:byName.get(entry.waiter.toLocaleLowerCase('ro')),latePersonId:byName.get(entry.latePerson.toLocaleLowerCase('ro')),waiterName:entry.waiter,latePersonName:entry.latePerson,minutes:Number(entry.minutes),reason:entry.reason||'',date:entry.date,status:'confirmed',reactions:{},createdBy:auth.currentUser.uid,createdByName:auth.currentUser.displayName||'Admin',createdAt:serverTimestamp(),imported:true});}
    return legacy.entries.length;
  }
};
window.halbaCloud=cloud;

function setBusy(busy,message=''){loginButton.disabled=busy;loginButton.classList.toggle('loading',busy);if(message)status.textContent=message;}
function showUser(user){document.body.classList.remove('auth-pending');document.body.classList.add('auth-signed-in');document.querySelector('#authName').textContent=user.displayName||'Membru al echipei';document.querySelector('#authEmail').textContent=user.email||'cont Google';const avatar=document.querySelector('#authAvatar');avatar.src=user.photoURL||'./assets/icon.svg';avatar.alt=user.displayName?`Fotografia lui ${user.displayName}`:'Fotografie profil';}
function showLogin(message='Conectare securizată prin Firebase'){document.body.classList.remove('auth-signed-in','team-ready');document.body.classList.add('auth-pending');setBusy(false,message);}
function friendlyError(error){const messages={'auth/popup-closed-by-user':'Fereastra Google a fost închisă.','auth/cancelled-popup-request':'Conectarea a fost anulată.','auth/account-exists-with-different-credential':'Acest e-mail folosește deja altă metodă de conectare.','auth/unauthorized-domain':'Domeniul aplicației nu este încă autorizat în Firebase.','auth/network-request-failed':'Nu există conexiune la internet. Încearcă din nou.'};return messages[error?.code]||'Conectarea nu a reușit. Încearcă din nou.';}

loginButton.addEventListener('click',async()=>{setBusy(true,'Se deschide contul Google…');try{await setPersistence(auth,browserLocalPersistence);await signInWithPopup(auth,provider);}catch(error){if(error?.code==='auth/popup-blocked'||error?.code==='auth/operation-not-supported-in-this-environment'){await signInWithRedirect(auth,provider);return;}showLogin(friendlyError(error));}});
logoutButton.addEventListener('click',async()=>{logoutButton.disabled=true;try{await signOut(auth);}finally{logoutButton.disabled=false;}});
onAuthStateChanged(auth,user=>{window.halbaCurrentUser=user;if(user)showUser(user);else showLogin();window.dispatchEvent(new CustomEvent('halba-auth-ready',{detail:{user}}));});
getRedirectResult(auth).catch(error=>showLogin(friendlyError(error)));
