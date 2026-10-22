const STORAGE_KEY = 'halba-intarzierilor-v3';
const GOAL = 60;
const now = new Date();
const iso = date => date.toISOString().slice(0, 10);
const shiftDays = days => { const d = new Date(now); d.setDate(d.getDate() + days); return iso(d); };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const demoEntries = [
  { id:'d1', waiter:'Spicica Vitalie', latePerson:'Valeriu Svetlicenco', minutes:12, reason:'Trafic la semafor', date:shiftDays(-1) },
  { id:'d2', waiter:'Spicica Vitalie', latePerson:'Valeriu Svetlicenco', minutes:8, reason:'Alarma a pierdut lupta', date:shiftDays(-2) },
  { id:'d3', waiter:'Valeriu Svetlicenco', latePerson:'Spicica Vitalie', minutes:5, reason:'Cafeaua', date:shiftDays(-3) },
  { id:'d4', waiter:'Spicica Vitalie', latePerson:'Valeriu Svetlicenco', minutes:7, reason:'Pornire mai grea', date:shiftDays(-4) },
  { id:'o1', waiter:'Spicica Vitalie', latePerson:'Valeriu Svetlicenco', minutes:35, reason:'Trafic', date:shiftDays(-9) },
  { id:'o2', waiter:'Valeriu Svetlicenco', latePerson:'Spicica Vitalie', minutes:29, reason:'Parcare', date:shiftDays(-10) },
  { id:'o3', waiter:'Spicica Vitalie', latePerson:'Valeriu Svetlicenco', minutes:23, reason:'', date:shiftDays(-17) }
];

let state = loadState();
let pendingDelete = null;
let previousMaxFill = 0;

function loadState() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved?.entries) return saved; } catch (_) {}
  return { entries: demoEntries.map(entry => ({ ...entry })) };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function escapeHTML(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }
function mondayOf(dateLike = now) { const d = new Date(dateLike); d.setHours(12,0,0,0); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d; }
function weekKey(dateLike) { return iso(mondayOf(new Date(`${dateLike}T12:00:00`))); }
function currentWeekEntries() { const key = iso(mondayOf()); return state.entries.filter(entry => weekKey(entry.date) === key); }
function formatDate(value) { return new Intl.DateTimeFormat('ro-RO',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${value}T12:00:00`)); }
function formatWeek(key) { const start = new Date(`${key}T12:00:00`); const end = new Date(start); end.setDate(end.getDate()+6); const a = new Intl.DateTimeFormat('ro-RO',{day:'numeric',month:'short'}).format(start); const b = new Intl.DateTimeFormat('ro-RO',{day:'numeric',month:'short'}).format(end); return `${a} — ${b}`; }
function initials(name) { return name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase(); }

function mugStats(entries) {
  const people = new Set();
  state.entries.forEach(entry => { people.add(entry.waiter); people.add(entry.latePerson); });
  const totals = {};
  const debtors = {};
  entries.forEach(entry => {
    totals[entry.waiter] = (totals[entry.waiter] || 0) + Number(entry.minutes);
    debtors[entry.waiter] ||= {};
    debtors[entry.waiter][entry.latePerson] = (debtors[entry.waiter][entry.latePerson] || 0) + Number(entry.minutes);
  });
  return [...people].filter(Boolean).map(name => {
    const total = totals[name] || 0;
    const debtor = Object.entries(debtors[name] || {}).sort((a,b) => b[1]-a[1])[0];
    return { name, total, fill:Math.min(100,Math.round(total/GOAL*100)), debtor };
  }).sort((a,b) => b.total-a.total || a.name.localeCompare(b.name));
}

function mugMarkup(person) {
  const debtorText = person.debtor ? `${escapeHTML(person.debtor[0].split(' ')[0])} îi datorează ${person.debtor[1]} min` : 'N-a așteptat pe nimeni încă';
  return `<article class="person-mug-card glass-panel ${person.total>=GOAL?'won':''}"><div class="person-mug-head"><span class="person-avatar">${initials(person.name)}</span><div><h3>${escapeHTML(person.name)}</h3><small>HALBA LUI</small></div><b>${person.fill}%</b></div><div class="mini-mug-stage"><div class="mug-wrap"><div class="mug-handle"></div><div class="mug-base"></div><div class="mug"><div class="glass-shine"></div><div class="beer" style="--fill:${person.fill}%"><div class="beer-wave wave-a"></div><div class="beer-wave wave-b"></div><div class="foam"><span></span><span></span><span></span><span></span><span></span></div><i class="bubble b1"></i><i class="bubble b2"></i><i class="bubble b3"></i><i class="bubble b4"></i><i class="bubble b5"></i></div></div></div></div><div class="person-mug-foot"><strong>${person.total} <small>/ ${GOAL} min</small></strong><span>${debtorText}</span></div>${person.total>=GOAL?'<div class="personal-win">🍻 BERE CÂȘTIGATĂ</div>':''}</article>`;
}

function renderAll(animate = false) {
  const entries = currentWeekEntries().sort((a,b) => b.date.localeCompare(a.date));
  const mugs = mugStats(entries);
  const leader = mugs[0];
  const nextBeer = mugs.filter(m => m.total < GOAL).sort((a,b) => (GOAL-a.total)-(GOAL-b.total))[0];
  const winners = mugs.filter(m => m.total >= GOAL);
  const maxFill = Math.max(0,...mugs.map(m => m.fill));
  const week = iso(mondayOf());

  $('#weekRange').textContent = formatWeek(week).toUpperCase();
  $('#mugsGrid').innerHTML = mugs.length ? mugs.map(mugMarkup).join('') : '<div class="empty glass-panel"><b>Nicio halbă încă.</b><span>Adaugă prima întârziere.</span></div>';
  $('#entryCount').textContent = entries.length;
  $('#leaderName').textContent = leader?.name.split(' ')[0] || '—';
  $('#leaderMinutes').textContent = leader ? `${leader.total} minute în halba lui` : 'fără întârzieri';
  $('#remainingMinutes').textContent = nextBeer ? `${Math.max(0,GOAL-nextBeer.total)} min` : (winners.length ? '0 min' : '—');
  $('#weekendCard').classList.toggle('unlocked', winners.length > 0);
  $('#weekendLock').textContent = winners.length ? '🍻' : '🔒';
  $('#weekendTitle').textContent = winners.length ? `${winners.map(w=>w.name.split(' ')[0]).join(' și ')} ${winners.length>1?'și-au':'și-a'} câștigat berea!` : 'Mai avem până la bere.';
  $('#weekendCopy').textContent = winners.length ? 'O halbă s-a umplut. Datornicul și cel care a așteptat aleg locul pentru întâlnirea din weekend.' : nextBeer ? `Mai sunt ${Math.max(0,GOAL-nextBeer.total)} minute până la următoarea bere oficială.` : 'Adaugă prima întârziere și începe provocarea.';
  $('#entriesList').innerHTML = entries.length ? entries.map(entryRow).join('') : '<div class="empty"><b>Toate halbele sunt goale.</b><span>Poate săptămâna asta ajungem la timp.</span></div>';
  renderHistory();
  if (animate && maxFill >= 100 && previousMaxFill < 100) launchConfetti();
  previousMaxFill = maxFill;
}

function entryRow(entry) {
  const reason = entry.reason ? ` • ${escapeHTML(entry.reason)}` : '';
  return `<article class="entry-row"><span class="entry-avatar">${initials(entry.waiter)}</span><div class="entry-person"><b>${escapeHTML(entry.waiter)}</b><span>L-a așteptat pe ${escapeHTML(entry.latePerson)}${reason}</span></div><time class="entry-date">${formatDate(entry.date)}</time><strong class="entry-minutes">+${entry.minutes} min</strong><div class="entry-actions"><button class="icon-btn" data-edit="${entry.id}" aria-label="Editează">✎</button><button class="icon-btn" data-delete="${entry.id}" aria-label="Șterge">×</button></div></article>`;
}

function renderHistory() {
  const groups = state.entries.reduce((map, entry) => { const key=weekKey(entry.date); (map[key] ||= []).push(entry); return map; }, {});
  const currentKey=iso(mondayOf());
  const weeks=Object.entries(groups).filter(([key])=>key!==currentKey).sort((a,b)=>b[0].localeCompare(a[0]));
  $('#historyGrid').innerHTML = weeks.length ? weeks.map(([key,entries]) => {
    const mugs=mugStats(entries).filter(m=>m.total>0); const leader=mugs[0]; const won=mugs.filter(m=>m.total>=GOAL);
    return `<article class="history-card glass-panel"><div class="history-top"><small>${formatWeek(key)}</small><span class="result">${won.length?'BERE CÂȘTIGATĂ':'HALBE NEUMPLUTE'}</span></div><strong>${leader?`${leader.name.split(' ')[0]}: ${leader.total} min`:'0 min'}</strong><p>${entries.length} înregistrări • ${mugs.length} halbe active</p></article>`;
  }).join('') : '<div class="empty glass-panel"><b>Încă nu avem istoric.</b><span>Prima săptămână se scrie chiar acum.</span></div>';
}

function openForm(entry = null) {
  $('#entryId').value = entry?.id || '';
  $('#waiterInput').value = entry?.waiter || '';
  $('#latePersonInput').value = entry?.latePerson || '';
  $('#minutesInput').value = entry?.minutes || '';
  $('#dateInput').value = entry?.date || iso(now);
  $('#reasonInput').value = entry?.reason || '';
  $('#formEyebrow').textContent = entry ? 'CORECTEAZĂ MINUTELE' : 'UMPLE HALBA CORECTĂ';
  $('#formTitle').textContent = entry ? 'Editează întârzierea' : 'Adaugă întârzierea';
  $('#lateDialog').showModal();
  setTimeout(() => $('#waiterInput').focus(), 80);
}

function saveEntry(event) {
  event.preventDefault();
  const item = { id:$('#entryId').value||`e-${Date.now()}`, waiter:$('#waiterInput').value.trim(), latePerson:$('#latePersonInput').value.trim(), minutes:Math.min(180,Math.max(1,Number($('#minutesInput').value))), reason:$('#reasonInput').value.trim(), date:$('#dateInput').value };
  if (!item.waiter || !item.latePerson || !item.date || !item.minutes) return;
  const index=state.entries.findIndex(entry=>entry.id===item.id);
  if(index>=0) state.entries[index]=item; else state.entries.push(item);
  saveState(); $('#lateDialog').close(); renderAll(true);
  showToast(index>=0?'Întârzierea a fost corectată.':`Minutele au intrat în halba lui ${item.waiter.split(' ')[0]}.`);
}

function removeEntry(){state.entries=state.entries.filter(entry=>entry.id!==pendingDelete);pendingDelete=null;saveState();$('#deleteDialog').close();renderAll();showToast('Minutele au fost scoase din halbă.');}
function showToast(message){const toast=$('#toast');$('span',toast).textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2800);}
function launchConfetti(){const root=$('#confetti');root.innerHTML=Array.from({length:42},()=>`<i style="--x:${(Math.random()-.5)*700}px;--y:${80+Math.random()*420}px;left:${12+Math.random()*76}%;animation-delay:${Math.random()*.35}s"></i>`).join('');setTimeout(()=>root.innerHTML='',2300);}
function syncView(){const view=location.hash==='#istoric'?'istoric':'acasa';$$('.view').forEach(node=>node.classList.toggle('active',node.dataset.view===view));$$('[data-nav]').forEach(node=>node.classList.toggle('active',node.dataset.nav===view));window.scrollTo({top:0,behavior:'smooth'});}
async function shareApp(){const data={title:'Halba întârzierilor',text:'Fiecare are halba lui. Cine așteaptă adună minute, iar la 60 primește o bere!',url:location.origin};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);showToast('Link copiat. Trimite-l colegului!');}}catch(_){}}

document.addEventListener('click',event=>{if(event.target.closest('[data-open-add]'))openForm();const edit=event.target.closest('[data-edit]');if(edit)openForm(state.entries.find(entry=>entry.id===edit.dataset.edit));const remove=event.target.closest('[data-delete]');if(remove){pendingDelete=remove.dataset.delete;$('#deleteDialog').showModal();}const quick=event.target.closest('[data-minutes]');if(quick)$('#minutesInput').value=quick.dataset.minutes;});
$('#lateForm').addEventListener('submit',saveEntry);
$('#confirmDelete').addEventListener('click',event=>{event.preventDefault();removeEntry();});
$('#shareButton').addEventListener('click',shareApp);
window.addEventListener('hashchange',syncView);
renderAll(); syncView();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
