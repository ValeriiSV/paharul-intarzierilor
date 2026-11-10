const GOAL=60;
const $=(selector,parent=document)=>parent.querySelector(selector);
const $$=(selector,parent=document)=>[...parent.querySelectorAll(selector)];
const iso=date=>date.toISOString().slice(0,10);
let user=null,teamId=null,team=null,member=null,participants=[],entries=[],unsubs=[];
let pendingDelete=null,pendingPerson=null,previousMaxFill=0,bootToken=0;

function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);}
function initials(name=''){return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?';}
function mondayOf(dateLike=new Date()){const d=new Date(dateLike);d.setHours(12,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d;}
function weekKey(dateLike){return iso(mondayOf(new Date(`${dateLike}T12:00:00`)));}
function formatDate(value){return new Intl.DateTimeFormat('ro-RO',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`));}
function formatWeek(key){const start=new Date(`${key}T12:00:00`),end=new Date(start);end.setDate(end.getDate()+6);const f={day:'numeric',month:'short'};return `${new Intl.DateTimeFormat('ro-RO',f).format(start)} — ${new Intl.DateTimeFormat('ro-RO',f).format(end)}`;}
function participant(id){return participants.find(p=>p.id===id);}
function activeParticipants(){return participants.filter(p=>p.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'ro'));}
function currentWeekEntries(){const key=iso(mondayOf());return entries.filter(e=>e.date&&weekKey(e.date)===key&&e.status!=='disputed');}
function inviteLink(){return team?.inviteCode?`${location.origin}${location.pathname}?invite=${team.inviteCode}`:location.origin;}
function isAdmin(){return member?.role==='admin';}

async function boot(currentUser){
  const token=++bootToken;cleanupSubscriptions();user=currentUser;
  if(!user){teamId=null;team=null;member=null;participants=[];entries=[];return;}
  setSync('Caut echipa…');
  try{
    const code=new URLSearchParams(location.search).get('invite');
    const profile=await window.halbaCloud.getUserProfile(user.uid);
    if(token!==bootToken)return;
    if(code){
      try{const joined=await window.halbaCloud.joinTeam(user,code);history.replaceState({},'',`${location.pathname}#acasa`);await connectTeam(joined.teamId);showToast('Ai intrat în echipă. Bun venit!');return;}
      catch(error){if(profile?.activeTeamId){showToast(error.message||'Invitația nu este validă.');await connectTeam(profile.activeTeamId);return;}showTeamGate(code,error.message);return;}
    }
    if(profile?.activeTeamId)await connectTeam(profile.activeTeamId);else showTeamGate();
  }catch(error){showTeamGate('',`Nu am putut încărca echipa: ${error.message}`);}
}

function cleanupSubscriptions(){unsubs.forEach(fn=>{try{fn();}catch(_){}});unsubs=[];}
function showTeamGate(code='',message=''){document.body.classList.remove('team-ready');$('#teamGate').hidden=false;$('#inviteCodeInput').value=(code||'').toUpperCase();$('#teamGateStatus').textContent=message|| (code?'Invitația este pregătită. Intră în echipă.':'');}
async function connectTeam(id){
  cleanupSubscriptions();teamId=id;$('#teamGate').hidden=true;document.body.classList.add('team-ready');setSync('Sincronizare în timp real…');
  unsubs=window.halbaCloud.subscribeTeam(teamId,user.uid,{
    team:value=>{team=value;if(!team){showTeamGate('','Echipa nu mai este disponibilă.');return;}$('#teamNameTop').textContent=team.name.toUpperCase();$('#teamNameAdmin').textContent=team.name;$('#inviteCode').textContent=team.inviteCode||'—';renderAll();},
    member:value=>{member=value;renderPermissions();renderAll();},
    participants:value=>{participants=value;renderAll();},
    entries:value=>{entries=value.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));renderAll(true);setSync('Salvat în cloud • actualizat live');},
    error:error=>{console.error(error);setSync('Eroare de sincronizare');showToast('Nu am putut sincroniza datele.');}
  });
}

function renderPermissions(){const admin=isAdmin();$('.admin-badge').textContent=admin?'ADMIN':'MEMBRU';$('.participant-add').hidden=!admin;const adminNav=$('[data-nav="admin"]');if(adminNav)adminNav.querySelector('.menu-label').textContent=admin?'Admin':'Echipă';}
function setSync(text){$('#syncStatus').textContent=text;}

function mugStats(list){
  const totals={},debtors={};
  list.forEach(entry=>{totals[entry.waiterId]=(totals[entry.waiterId]||0)+Number(entry.minutes);debtors[entry.waiterId]||={};debtors[entry.waiterId][entry.latePersonId]=(debtors[entry.waiterId][entry.latePersonId]||0)+Number(entry.minutes);});
  const ids=new Set(activeParticipants().map(p=>p.id));list.forEach(e=>{ids.add(e.waiterId);ids.add(e.latePersonId);});
  return [...ids].map(id=>{const p=participant(id);if(!p)return null;const total=totals[id]||0,debtor=Object.entries(debtors[id]||{}).sort((a,b)=>b[1]-a[1])[0];return{id,name:p.name,total,fill:Math.min(100,Math.round(total/GOAL*100)),debtor};}).filter(Boolean).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'ro'));
}
function mugMarkup(person){const debtor=person.debtor?participant(person.debtor[0]):null;const debtorText=debtor?`${escapeHTML(debtor.name.split(' ')[0])} îi datorează ${person.debtor[1]} min`:'N-a așteptat pe nimeni încă';return `<article class="person-mug-card glass-panel ${person.total>=GOAL?'won':''}"><div class="person-mug-head"><span class="person-avatar">${initials(person.name)}</span><div><h3>${escapeHTML(person.name)}</h3><small>HALBA LUI</small></div><b>${person.fill}%</b></div><div class="mini-mug-stage"><div class="mug-wrap"><div class="mug-handle"></div><div class="mug-base"></div><div class="mug"><div class="glass-shine"></div><div class="beer" style="--fill:${person.fill}%"><div class="beer-wave wave-a"></div><div class="beer-wave wave-b"></div><div class="foam"><span></span><span></span><span></span><span></span><span></span></div><i class="bubble b1"></i><i class="bubble b2"></i><i class="bubble b3"></i><i class="bubble b4"></i><i class="bubble b5"></i></div></div></div></div><div class="person-mug-foot"><strong>${person.total} <small>/ ${GOAL} min</small></strong><span>${debtorText}</span></div>${person.total>=GOAL?'<div class="personal-win">🍻 BERE CÂȘTIGATĂ</div>':''}</article>`;}

function renderAll(animate=false){
  const weekEntries=currentWeekEntries(),mugs=mugStats(weekEntries),leader=mugs[0],nextBeer=mugs.filter(m=>m.total<GOAL).sort((a,b)=>b.total-a.total)[0],winners=mugs.filter(m=>m.total>=GOAL),maxFill=Math.max(0,...mugs.map(m=>m.fill));
  $('#weekRange').textContent=formatWeek(iso(mondayOf())).toUpperCase();
  $('#mugsGrid').innerHTML=mugs.length?mugs.map(mugMarkup).join(''):'<div class="empty glass-panel"><b>Nicio halbă încă.</b><span>Adminul adaugă participanții, apoi puteți începe.</span></div>';
  $('#entryCount').textContent=weekEntries.length;$('#leaderName').textContent=leader?.name.split(' ')[0]||'—';$('#leaderMinutes').textContent=leader?`${leader.total} minute în halba lui`:'fără întârzieri';$('#remainingMinutes').textContent=nextBeer?`${GOAL-nextBeer.total} min`:(winners.length?'0 min':'—');
  $('#weekendCard').classList.toggle('unlocked',winners.length>0);$('#weekendLock').textContent=winners.length?'🍻':'🔒';$('#weekendTitle').textContent=winners.length?`${winners.map(w=>w.name.split(' ')[0]).join(' și ')} ${winners.length>1?'și-au':'și-a'} câștigat berea!`:'Mai avem până la bere.';$('#weekendCopy').textContent=winners.length?'O halbă s-a umplut. Alegeți locul și ora pentru întâlnirea din weekend.':nextBeer?`Mai sunt ${GOAL-nextBeer.total} minute până la următoarea bere oficială.`:'Adaugă participanții și prima întârziere.';
  $('#entriesList').innerHTML=weekEntries.length?weekEntries.map(entryRow).join(''):'<div class="empty"><b>Toate halbele sunt goale.</b><span>Orice coleg conectat poate adăuga prima întârziere.</span></div>';
  renderHistory();renderParticipants();populateParticipantSelects();
  if(animate&&maxFill>=100&&previousMaxFill<100)launchConfetti();previousMaxFill=maxFill;
}

function entryRow(entry){
  const waiter=participant(entry.waiterId),late=participant(entry.latePersonId);if(!waiter||!late)return'';
  const canManage=isAdmin()||entry.createdBy===user?.uid;const canConfirm=isAdmin()||late.linkedUid===user?.uid;const status=entry.status||'pending';const statusLabel={pending:'AȘTEAPTĂ CONFIRMARE',confirmed:'CONFIRMATĂ',disputed:'CONTESTATĂ'}[status];const reactions=Object.values(entry.reactions||{});const counts=reactions.reduce((m,e)=>{m[e]=(m[e]||0)+1;return m;},{});
  return `<article class="entry-row cloud-entry"><span class="entry-avatar">${initials(waiter.name)}</span><div class="entry-person"><b>${escapeHTML(waiter.name)}</b><span>L-a așteptat pe ${escapeHTML(late.name)}${entry.reason?` • ${escapeHTML(entry.reason)}`:''}</span><small class="entry-meta">Adăugat de ${escapeHTML(entry.createdByName||'membru')} • <i class="status-${status}">${statusLabel}</i></small><div class="reaction-bar">${['🍺','😴','🚗','⏰'].map(e=>`<button data-react="${entry.id}" data-emoji="${e}" title="Reacționează">${e}${counts[e]?` <b>${counts[e]}</b>`:''}</button>`).join('')}</div></div><time class="entry-date">${formatDate(entry.date)}</time><strong class="entry-minutes">+${entry.minutes} min</strong><div class="entry-actions">${canConfirm&&status==='pending'?`<button class="icon-btn confirm-btn" data-status="confirmed" data-entry="${entry.id}" title="Confirmă">✓</button><button class="icon-btn" data-status="disputed" data-entry="${entry.id}" title="Contestă">!</button>`:''}${canManage?`<button class="icon-btn" data-edit="${entry.id}" aria-label="Editează">✎</button><button class="icon-btn" data-delete="${entry.id}" aria-label="Șterge">×</button>`:''}</div></article>`;
}

function renderParticipants(){
  const list=activeParticipants();$('#participantCount').textContent=list.length;
  $('#participantsList').innerHTML=list.length?list.map((p,index)=>`<article class="participant-row"><span class="person-avatar">${initials(p.name)}</span><div><b>${escapeHTML(p.name)}</b><small>${p.linkedUid?'Cont Google conectat':'Participant manual'} • halba #${String(index+1).padStart(2,'0')}</small></div><span class="active-chip"><i></i> ACTIV</span>${isAdmin()?`<button class="icon-btn" data-remove-person="${p.id}" aria-label="Scoate ${escapeHTML(p.name)}">×</button>`:'<span></span>'}</article>`).join(''):'<div class="empty"><b>Lista este goală.</b><span>Adminul adaugă participanții.</span></div>';
}
function renderHistory(){const groups=entries.reduce((map,e)=>{if(!e.date||e.status==='disputed')return map;const key=weekKey(e.date);(map[key]||=[]).push(e);return map;},{}),current=iso(mondayOf());const weeks=Object.entries(groups).filter(([key])=>key!==current).sort((a,b)=>b[0].localeCompare(a[0]));$('#historyGrid').innerHTML=weeks.length?weeks.map(([key,list])=>{const mugs=mugStats(list),leader=mugs[0],won=mugs.filter(m=>m.total>=GOAL);return `<article class="history-card glass-panel"><div class="history-top"><small>${formatWeek(key)}</small><span class="result">${won.length?'BERE CÂȘTIGATĂ':'HALBE NEUMPLUTE'}</span></div><strong>${leader?`${escapeHTML(leader.name.split(' ')[0])}: ${leader.total} min`:'0 min'}</strong><p>${list.length} înregistrări • sincronizate în cloud</p></article>`;}).join(''):'<div class="empty glass-panel"><b>Încă nu avem istoric.</b><span>Prima săptămână se scrie chiar acum.</span></div>';}
function populateParticipantSelects(){const option='<option value="">Selectează persoana</option>'+activeParticipants().map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');const w=$('#waiterInput').value,l=$('#latePersonInput').value;$('#waiterInput').innerHTML=option;$('#latePersonInput').innerHTML=option;if(participant(w)?.active!==false)$('#waiterInput').value=w;if(participant(l)?.active!==false)$('#latePersonInput').value=l;}

function openForm(entry=null){if(activeParticipants().length<2){location.hash='#admin';showToast('Adminul trebuie să adauge cel puțin două persoane.');return;}populateParticipantSelects();$('#entryId').value=entry?.id||'';$('#waiterInput').value=entry?.waiterId||'';$('#latePersonInput').value=entry?.latePersonId||'';$('#minutesInput').value=entry?.minutes||'';$('#dateInput').value=entry?.date||iso(new Date());$('#reasonInput').value=entry?.reason||'';$('#formTitle').textContent=entry?'Editează întârzierea':'Adaugă întârzierea';$('#lateDialog').showModal();}
async function saveEntry(event){event.preventDefault();const waiterId=$('#waiterInput').value,latePersonId=$('#latePersonInput').value;if(waiterId===latePersonId){showToast('Alege două persoane diferite.');return;}const data={waiterId,latePersonId,waiterName:participant(waiterId)?.name||'',latePersonName:participant(latePersonId)?.name||'',minutes:Math.min(180,Math.max(1,Number($('#minutesInput').value))),date:$('#dateInput').value,reason:$('#reasonInput').value.trim()};if(!data.waiterId||!data.latePersonId||!data.date)return;const id=$('#entryId').value;setSync('Se salvează…');try{await window.halbaCloud.saveEntry(teamId,data,id||null);$('#lateDialog').close();showToast(id?'Întârzierea a fost corectată.':`Minutele au intrat în halba lui ${data.waiterName.split(' ')[0]}.`);}catch(error){showToast(`Nu s-a salvat: ${error.message}`);setSync('Eroare la salvare');}}
async function addParticipant(event){event.preventDefault();if(!isAdmin()){showToast('Doar adminul poate adăuga persoane.');return;}const name=$('#participantName').value.trim().replace(/\s+/g,' ');if(!name)return;if(activeParticipants().some(p=>p.name.localeCompare(name,'ro',{sensitivity:'base'})===0)){showToast('Persoana este deja în listă.');return;}try{await window.halbaCloud.addParticipant(teamId,name);$('#participantName').value='';showToast(`${name} a fost adăugat.`);}catch(error){showToast(`Nu s-a adăugat: ${error.message}`);}}
async function removeEntry(){try{await window.halbaCloud.deleteEntry(teamId,pendingDelete);$('#deleteDialog').close();showToast('Întârzierea a fost ștearsă.');}catch(error){showToast(`Nu s-a șters: ${error.message}`);}pendingDelete=null;}
async function removeParticipant(){try{await window.halbaCloud.setParticipantActive(teamId,pendingPerson,false);$('#personDeleteDialog').close();showToast('Participantul a fost scos din lista activă.');}catch(error){showToast(`Nu s-a actualizat: ${error.message}`);}pendingPerson=null;}

async function createTeam(event){event.preventDefault();const name=$('#teamNameInput').value.trim();setTeamStatus('Se creează echipa…');try{const result=await window.halbaCloud.createTeam(user,name);let migrated=0;try{const legacy=JSON.parse(localStorage.getItem('halba-intarzierilor-v4'));if(legacy&&!localStorage.getItem(`halba-migrated-${result.teamId}`)){migrated=await window.halbaCloud.importLegacy(result.teamId,legacy);localStorage.setItem(`halba-migrated-${result.teamId}`,'1');}}catch(_){}await connectTeam(result.teamId);showToast(migrated?`Echipa este gata. Am mutat ${migrated} întârzieri în cloud.`:'Echipa este gata. Trimite linkul colegului!');}catch(error){setTeamStatus(error.message||'Nu am putut crea echipa.');}}
async function joinTeam(event){event.preventDefault();setTeamStatus('Verific invitația…');try{const result=await window.halbaCloud.joinTeam(user,$('#inviteCodeInput').value);history.replaceState({},'',`${location.pathname}#acasa`);await connectTeam(result.teamId);showToast('Ai intrat în echipă!');}catch(error){setTeamStatus(error.message||'Nu am putut intra în echipă.');}}
function setTeamStatus(message){$('#teamGateStatus').textContent=message;}
async function shareInvite(){if(!team?.inviteCode){showToast('Echipa se încarcă.');return;}const data={title:`Invitație în ${team.name}`,text:`Intră în echipa mea „${team.name}” din Halba întârzierilor.`,url:inviteLink()};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(data.url);showToast('Linkul de invitație a fost copiat!');}}catch(_){} }

function showToast(message){const toast=$('#toast');$('span',toast).textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),3200);}
function launchConfetti(){const root=$('#confetti');root.innerHTML=Array.from({length:42},()=>`<i style="--x:${(Math.random()-.5)*700}px;--y:${80+Math.random()*420}px;left:${12+Math.random()*76}%;animation-delay:${Math.random()*.35}s"></i>`).join('');setTimeout(()=>root.innerHTML='',2300);}
function setMenu(expanded){document.body.classList.toggle('menu-expanded',expanded);$('#menuToggle').setAttribute('aria-expanded',String(expanded));localStorage.setItem('halba-menu-expanded',String(expanded));}
function syncView(){const allowed=['acasa','istoric','admin'],raw=location.hash.replace('#',''),view=allowed.includes(raw)?raw:'acasa';$$('.view').forEach(node=>node.classList.toggle('active',node.dataset.view===view));$$('[data-nav]').forEach(node=>node.classList.toggle('active',node.dataset.nav===view));$('#pageTitle').textContent={acasa:'Halbele săptămânii',istoric:'Istoricul echipei',admin:isAdmin()?'Administrare participanți':'Echipa și invitația'}[view];if(innerWidth<700)setMenu(false);window.scrollTo({top:0,behavior:'smooth'});}

document.addEventListener('click',async event=>{
  const close=event.target.closest('[data-close-dialog]');if(close)close.closest('dialog').close();if(event.target.closest('[data-open-add]'))openForm();
  const edit=event.target.closest('[data-edit]');if(edit)openForm(entries.find(e=>e.id===edit.dataset.edit));
  const remove=event.target.closest('[data-delete]');if(remove){pendingDelete=remove.dataset.delete;$('#deleteDialog').showModal();}
  const removePerson=event.target.closest('[data-remove-person]');if(removePerson){pendingPerson=removePerson.dataset.removePerson;$('#personDeleteDialog').showModal();}
  const quick=event.target.closest('[data-minutes]');if(quick)$('#minutesInput').value=quick.dataset.minutes;
  const statusBtn=event.target.closest('[data-status]');if(statusBtn){try{await window.halbaCloud.setEntryStatus(teamId,statusBtn.dataset.entry,statusBtn.dataset.status);showToast(statusBtn.dataset.status==='confirmed'?'Întârzierea a fost confirmată.':'Întârzierea a fost contestată.');}catch(error){showToast(error.message);}}
  const react=event.target.closest('[data-react]');if(react){try{await window.halbaCloud.react(teamId,react.dataset.react,react.dataset.emoji);}catch(error){showToast(error.message);}}
});
$('#lateForm').addEventListener('submit',saveEntry);$('#participantForm').addEventListener('submit',addParticipant);$('#createTeamForm').addEventListener('submit',createTeam);$('#joinTeamForm').addEventListener('submit',joinTeam);$('#confirmDelete').addEventListener('click',event=>{event.preventDefault();removeEntry();});$('#confirmPersonDelete').addEventListener('click',event=>{event.preventDefault();removeParticipant();});$('#shareButton').addEventListener('click',shareInvite);$('#copyInvite').addEventListener('click',shareInvite);$('#menuToggle').addEventListener('click',()=>setMenu(!document.body.classList.contains('menu-expanded')));window.addEventListener('hashchange',syncView);window.addEventListener('halba-auth-ready',event=>boot(event.detail.user));
setMenu(localStorage.getItem('halba-menu-expanded')!=='false'&&innerWidth>=700);syncView();if(window.halbaCurrentUser!==undefined)boot(window.halbaCurrentUser);
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=11'));
