const STORAGE_KEY = 'halba-intarzierilor-v2';
const GOAL = 60;
const now = new Date();
const iso = date => date.toISOString().slice(0, 10);
const shiftDays = days => { const d = new Date(now); d.setDate(d.getDate() + days); return iso(d); };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const demoEntries = [
  { id: 'd1', name: 'Valeriu Svetlicenco', minutes: 12, reason: 'Trafic la semafor', date: shiftDays(-1) },
  { id: 'd2', name: 'Valeriu Svetlicenco', minutes: 8, reason: 'Alarma a pierdut lupta', date: shiftDays(-2) },
  { id: 'd3', name: 'Mihai Ceban', minutes: 5, reason: 'Cafeaua', date: shiftDays(-3) },
  { id: 'd4', name: 'Valeriu Svetlicenco', minutes: 7, reason: '', date: shiftDays(-4) },
  { id: 'o1', name: 'Valeriu Svetlicenco', minutes: 35, reason: 'Trafic', date: shiftDays(-9) },
  { id: 'o2', name: 'Mihai Ceban', minutes: 29, reason: 'Parcare', date: shiftDays(-10) },
  { id: 'o3', name: 'Valeriu Svetlicenco', minutes: 23, reason: '', date: shiftDays(-17) }
];

let state = loadState();
let pendingDelete = null;
let previousFill = 0;

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

function renderAll(animate = false) {
  const entries = currentWeekEntries().sort((a,b) => b.date.localeCompare(a.date));
  const total = entries.reduce((sum, entry) => sum + Number(entry.minutes), 0);
  const fill = Math.min(100, Math.round(total / GOAL * 100));
  const totals = entries.reduce((map, entry) => { map[entry.name] = (map[entry.name] || 0) + Number(entry.minutes); return map; }, {});
  const leader = Object.entries(totals).sort((a,b) => b[1]-a[1])[0];
  const week = iso(mondayOf());

  $('#weekRange').textContent = formatWeek(week).toUpperCase();
  $('#beerLiquid').style.setProperty('--fill', `${fill}%`);
  $('#fillPercent').textContent = `${fill}%`;
  $('#weekMinutes').textContent = total;
  $('#goalMinutes').textContent = GOAL;
  $('#entryCount').textContent = entries.length;
  $('#leaderName').textContent = leader?.[0].split(' ')[0] || '—';
  $('#leaderMinutes').textContent = leader ? `${leader[1]} minute adunate` : 'fără întârzieri';
  $('#remainingMinutes').textContent = total >= GOAL ? '0 min' : `${GOAL-total} min`;
  const won = total >= GOAL;
  $('#beerWon').classList.toggle('show', won);
  $('#weekendCard').classList.toggle('unlocked', won);
  $('#weekendLock').textContent = won ? '🍻' : '🔒';
  $('#weekendTitle').textContent = won ? 'Planul de weekend e activ!' : 'Mai avem până la bere.';
  $('#weekendCopy').textContent = won ? 'Halba este plină. Alegeți locul, ora și cine comandă prima rundă.' : `Mai sunt ${Math.max(0,GOAL-total)} minute până când berea din weekend devine oficială.`;
  $('#entriesList').innerHTML = entries.length ? entries.map(entryRow).join('') : '<div class="empty"><b>Halba e goală.</b><span>Poate săptămâna asta ajungem la timp.</span></div>';
  renderHistory();
  if (animate && won && previousFill < 100) launchConfetti();
  previousFill = fill;
}

function entryRow(entry) {
  return `<article class="entry-row"><span class="entry-avatar">${initials(entry.name)}</span><div class="entry-person"><b>${escapeHTML(entry.name)}</b><span>${entry.reason ? escapeHTML(entry.reason) : 'Fără scuză. Respect.'}</span></div><time class="entry-date">${formatDate(entry.date)}</time><strong class="entry-minutes">+${entry.minutes} min</strong><div class="entry-actions"><button class="icon-btn" data-edit="${entry.id}" aria-label="Editează">✎</button><button class="icon-btn" data-delete="${entry.id}" aria-label="Șterge">×</button></div></article>`;
}

function renderHistory() {
  const groups = state.entries.reduce((map, entry) => { const key = weekKey(entry.date); (map[key] ||= []).push(entry); return map; }, {});
  const currentKey = iso(mondayOf());
  const weeks = Object.entries(groups).filter(([key]) => key !== currentKey).sort((a,b) => b[0].localeCompare(a[0]));
  $('#historyGrid').innerHTML = weeks.length ? weeks.map(([key,entries]) => {
    const total = entries.reduce((sum,entry) => sum + Number(entry.minutes),0); const names = [...new Set(entries.map(e=>e.name.split(' ')[0]))].join(', ');
    return `<article class="history-card glass-panel"><div class="history-top"><small>${formatWeek(key)}</small><span class="result">${total>=GOAL?'BERE CÂȘTIGATĂ':'HALBĂ NEUMPLUTĂ'}</span></div><strong>${total} / ${GOAL} min</strong><p>${entries.length} întârzieri • ${escapeHTML(names)}</p></article>`;
  }).join('') : '<div class="empty glass-panel"><b>Încă nu avem istoric.</b><span>Prima săptămână se scrie chiar acum.</span></div>';
}

function openForm(entry = null) {
  $('#entryId').value = entry?.id || '';
  $('#nameInput').value = entry?.name || '';
  $('#minutesInput').value = entry?.minutes || '';
  $('#dateInput').value = entry?.date || iso(now);
  $('#reasonInput').value = entry?.reason || '';
  $('#formEyebrow').textContent = entry ? 'CORECTEAZĂ STROPUL' : 'UN STROP ÎN PLUS';
  $('#formTitle').textContent = entry ? 'Editează întârzierea' : 'Adaugă întârzierea';
  $('#lateDialog').showModal();
  setTimeout(() => $('#nameInput').focus(), 80);
}

function saveEntry(event) {
  event.preventDefault();
  const item = { id: $('#entryId').value || `e-${Date.now()}`, name: $('#nameInput').value.trim(), minutes: Math.min(180,Math.max(1,Number($('#minutesInput').value))), reason: $('#reasonInput').value.trim(), date: $('#dateInput').value };
  if (!item.name || !item.date || !item.minutes) return;
  const index = state.entries.findIndex(entry => entry.id === item.id);
  if (index >= 0) state.entries[index] = item; else state.entries.push(item);
  saveState(); $('#lateDialog').close(); renderAll(true); showToast(index>=0?'Întârzierea a fost corectată.':'Minutele au fost turnate în halbă.');
}

function removeEntry() { state.entries = state.entries.filter(entry => entry.id !== pendingDelete); pendingDelete = null; saveState(); $('#deleteDialog').close(); renderAll(); showToast('Minutele au fost scoase din halbă.'); }
function showToast(message) { const toast=$('#toast'); $('span',toast).textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2800); }
function launchConfetti() { const root=$('#confetti'); root.innerHTML=Array.from({length:30},(_,i)=>`<i style="--x:${(Math.random()-.5)*440}px;--y:${80+Math.random()*320}px;left:${20+Math.random()*60}%;animation-delay:${Math.random()*.35}s"></i>`).join(''); setTimeout(()=>root.innerHTML='',2300); }
function syncView() { const view=location.hash==='#istoric'?'istoric':'acasa'; $$('.view').forEach(node=>node.classList.toggle('active',node.dataset.view===view)); $$('[data-nav]').forEach(node=>node.classList.toggle('active',node.dataset.nav===view)); window.scrollTo({top:0,behavior:'smooth'}); }
async function shareApp() { const data={title:'Halba întârzierilor',text:'Fiecare minut întârziat umple halba. La 100% mergem la bere!',url:location.origin}; try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); showToast('Link copiat. Trimite-l colegului!'); } } catch (_) {} }

document.addEventListener('click', event => {
  if (event.target.closest('[data-open-add]')) openForm();
  const edit=event.target.closest('[data-edit]'); if(edit) openForm(state.entries.find(entry=>entry.id===edit.dataset.edit));
  const remove=event.target.closest('[data-delete]'); if(remove){pendingDelete=remove.dataset.delete;$('#deleteDialog').showModal();}
  const quick=event.target.closest('[data-minutes]'); if(quick) $('#minutesInput').value=quick.dataset.minutes;
});
$('#lateForm').addEventListener('submit',saveEntry);
$('#confirmDelete').addEventListener('click',event=>{event.preventDefault();removeEntry();});
$('#shareButton').addEventListener('click',shareApp);
window.addEventListener('hashchange',syncView);
renderAll(); syncView();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
