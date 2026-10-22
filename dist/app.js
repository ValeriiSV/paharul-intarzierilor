const STORAGE_KEY = 'paharul-intarzierilor-v1';

const people = [
  { id: 'ana', name: 'Ana Munteanu', initials: 'AM', role: 'Design', color: '#d57464', liquid: '#f47a61' },
  { id: 'radu', name: 'Radu Popescu', initials: 'RP', role: 'Development', color: '#698f8a', liquid: '#74c7a5' },
  { id: 'maria', name: 'Maria Ionescu', initials: 'MI', role: 'Marketing', color: '#8d78b8', liquid: '#a18de9' },
  { id: 'vlad', name: 'Vlad Lungu', initials: 'VL', role: 'Product', color: '#c0924f', liquid: '#e3b760' },
  { id: 'ioana', name: 'Ioana Rusu', initials: 'IR', role: 'Operations', color: '#628bb2', liquid: '#71a8d3' },
  { id: 'sergiu', name: 'Sergiu Rotaru', initials: 'SR', role: 'Sales', color: '#8a765f', liquid: '#c49c73' }
];

const today = new Date();
const iso = (date) => date.toISOString().slice(0, 10);
const shiftDays = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return iso(d); };
const monthKey = (dateString = iso(today)) => dateString.slice(0, 7);
const previousMonth = (offset) => { const d = new Date(today.getFullYear(), today.getMonth() - offset, 12); return monthKey(iso(d)); };
const demoEntries = [
  { id: 'e1', personId: 'ana', minutes: 18, reason: 'Trafic aglomerat', date: shiftDays(-1) },
  { id: 'e2', personId: 'ana', minutes: 9, reason: 'Cafeaua a durat mai mult', date: shiftDays(-5) },
  { id: 'e3', personId: 'radu', minutes: 12, reason: 'Autobuz întârziat', date: shiftDays(-2) },
  { id: 'e4', personId: 'maria', minutes: 7, reason: 'Ședință prelungită', date: shiftDays(-3) },
  { id: 'e5', personId: 'maria', minutes: 5, reason: '', date: shiftDays(-8) },
  { id: 'e6', personId: 'vlad', minutes: 4, reason: 'Parcare', date: shiftDays(-4) },
  { id: 'e7', personId: 'ioana', minutes: 2, reason: '', date: shiftDays(-6) },
  { id: 'h1', personId: 'radu', minutes: 34, reason: 'Trafic', date: `${previousMonth(1)}-08` },
  { id: 'h2', personId: 'vlad', minutes: 22, reason: 'Programare', date: `${previousMonth(1)}-17` },
  { id: 'h3', personId: 'ana', minutes: 11, reason: '', date: `${previousMonth(1)}-23` },
  { id: 'h4', personId: 'maria', minutes: 26, reason: 'Transport', date: `${previousMonth(2)}-12` },
  { id: 'h5', personId: 'sergiu', minutes: 16, reason: '', date: `${previousMonth(2)}-20` }
];

let state = loadState();
let pendingDeleteId = null;
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.entries) return saved;
  } catch (_) {}
  return { entries: demoEntries, theme: 'light' };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
}

function personFor(id) { return people.find(person => person.id === id); }
function entriesFor(month = monthKey()) { return state.entries.filter(entry => monthKey(entry.date) === month); }
function totalFor(personId, month = monthKey()) { return entriesFor(month).filter(entry => entry.personId === personId).reduce((sum, entry) => sum + Number(entry.minutes), 0); }
function formatDate(date) { return new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)); }
function formatMonth(key) { const [year, month] = key.split('-'); return new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1)); }

function renderAll() {
  renderDashboard();
  renderLeaderboard();
  renderHistoryControls();
  renderHistory();
  renderAdmin();
  syncNavigation();
}

function renderDashboard() {
  const current = entriesFor();
  const ranking = [...people].sort((a, b) => totalFor(b.id) - totalFor(a.id));
  const total = current.reduce((sum, entry) => sum + Number(entry.minutes), 0);
  $('#monthLabel').textContent = formatMonth(monthKey()).toUpperCase();
  $('#totalMinutes').textContent = total;
  $('#onTimeRate').textContent = `${Math.max(78, 98 - Math.round(total / 10))}%`;
  $('#topName').textContent = ranking[0]?.name.split(' ')[0] || '—';
  $('#bestStreak').textContent = `${Math.max(1, 14 - Math.ceil(current.length / 2))} zile`;
  $('#peopleGrid').innerHTML = ranking.map((person, index) => {
    const totalMinutes = totalFor(person.id);
    const fill = Math.min(100, totalMinutes * 2);
    const latest = current.filter(entry => entry.personId === person.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return `<article class="person-card">
      <div class="person-top">
        <div class="person-identity"><span class="person-avatar" style="background:${person.color}">${person.initials}</span><div><b>${person.name}</b><small>${person.role}</small></div></div>
        <span class="rank-badge">#${index + 1}</span>
      </div>
      <div class="glass-scene">
        <div class="glass-shadow"></div>
        <div class="glass"><div class="liquid" style="--fill:${fill}%;--liquid:${person.liquid}"></div><span class="fill-label">${fill}%</span></div>
      </div>
      <div class="person-stats"><strong>${totalMinutes} <span>MIN</span></strong><small>acumulate luna aceasta</small></div>
      <div class="last-entry"><span>${latest ? `Ultima: ${formatDate(latest.date)}` : 'Nicio întârziere'}</span><b>${latest ? `+${latest.minutes} min${latest.reason ? ` • ${escapeHTML(latest.reason)}` : ''}` : 'Perfect!'}</b></div>
    </article>`;
  }).join('');
}

function renderLeaderboard() {
  const max = Math.max(...people.map(person => totalFor(person.id)), 1);
  const sorted = [...people].sort((a, b) => totalFor(a.id) - totalFor(b.id));
  $('#leaderboard').innerHTML = sorted.map((person, index) => {
    const minutes = totalFor(person.id);
    return `<div class="leader-row">
      <span class="leader-rank">${String(index + 1).padStart(2, '0')}</span>
      <div class="leader-person"><span class="person-avatar" style="background:${person.color}">${person.initials}</span><div><b>${person.name}</b><small>${person.role}</small></div></div>
      <div class="progress-track"><i style="--progress:${(minutes / max) * 100}%;--bar:${person.liquid}"></i></div>
      <div class="leader-minutes">${minutes} <small>MIN</small></div>
    </div>`;
  }).join('');
}

function renderHistoryControls() {
  const months = [...new Set(state.entries.map(entry => monthKey(entry.date)))].sort().reverse();
  const select = $('#historyMonth');
  const selected = months.includes(select.value) ? select.value : (months[0] || monthKey());
  select.innerHTML = months.map(month => `<option value="${month}" ${month === selected ? 'selected' : ''}>${formatMonth(month)}</option>`).join('');
}

function renderHistory() {
  const selected = $('#historyMonth').value || monthKey();
  const entries = entriesFor(selected).sort((a, b) => b.date.localeCompare(a.date));
  const total = entries.reduce((sum, entry) => sum + Number(entry.minutes), 0);
  const leader = [...people].sort((a, b) => totalFor(b.id, selected) - totalFor(a.id, selected))[0];
  $('#historySummary').innerHTML = `<div class="summary-card"><small>Total minute</small><b>${total}</b></div><div class="summary-card"><small>Întârzieri</small><b>${entries.length}</b></div><div class="summary-card"><small>Cel mai plin pahar</small><b>${leader ? leader.name.split(' ')[0] : '—'}</b></div>`;
  $('#historyList').innerHTML = entries.length ? entries.map(entry => entryRow(entry, false)).join('') : emptyState('Lună fără întârzieri', 'Așa da — toate paharele au rămas goale.');
}

function entryRow(entry, admin) {
  const person = personFor(entry.personId);
  return `<div class="${admin ? 'admin-item' : 'history-item'}">
    <div class="entry-person"><span class="person-avatar" style="background:${person.color}">${person.initials}</span><div><b>${person.name}</b><small>${entry.reason ? escapeHTML(entry.reason) : 'Fără motiv'}</small></div></div>
    <span class="entry-date">${formatDate(entry.date)}</span>
    ${admin ? `<div class="admin-actions"><button class="mini-button" data-edit="${entry.id}" aria-label="Editează">✎</button><button class="mini-button danger" data-delete="${entry.id}" aria-label="Șterge">×</button></div>` : `<span class="entry-minutes">+${entry.minutes} min</span>`}
  </div>`;
}

function renderAdmin() {
  const entries = entriesFor().sort((a, b) => b.date.localeCompare(a.date));
  $('#adminCount').textContent = `${entries.length} înregistrări`;
  $('#adminList').innerHTML = entries.length ? entries.map(entry => entryRow(entry, true)).join('') : emptyState('Totul e curat', 'Nu există întârzieri în luna curentă.');
}

function emptyState(title, copy) { return `<div class="empty-state"><b>${title}</b><span>${copy}</span></div>`; }

function openAdd(entry = null) {
  const select = $('#personInput');
  select.innerHTML = people.map(person => `<option value="${person.id}">${person.name}</option>`).join('');
  $('#entryId').value = entry?.id || '';
  select.value = entry?.personId || people[0].id;
  $('#minutesInput').value = entry?.minutes || '';
  $('#reasonInput').value = entry?.reason || '';
  $('#dateInput').value = entry?.date || iso(today);
  $('#formEyebrow').textContent = entry ? 'CORECTARE' : 'ÎNREGISTRARE NOUĂ';
  $('#formTitle').textContent = entry ? 'Editează întârzierea' : 'Adaugă o întârziere';
  $('#lateDialog').showModal();
}

function handleSave(event) {
  event.preventDefault();
  const payload = {
    id: $('#entryId').value || `e-${Date.now()}`,
    personId: $('#personInput').value,
    minutes: Math.max(1, Math.min(240, Number($('#minutesInput').value))),
    reason: $('#reasonInput').value.trim(),
    date: $('#dateInput').value
  };
  if (!payload.date || !payload.minutes) return;
  const existing = state.entries.findIndex(entry => entry.id === payload.id);
  if (existing >= 0) state.entries[existing] = payload; else state.entries.push(payload);
  saveState(); renderAll(); $('#lateDialog').close();
  showToast(existing >= 0 ? 'Înregistrarea a fost actualizată.' : 'Întârzierea a fost adăugată. Paharul s-a umplut!');
}

function deleteEntry() {
  if (!pendingDeleteId) return;
  state.entries = state.entries.filter(entry => entry.id !== pendingDeleteId);
  pendingDeleteId = null; saveState(); renderAll(); $('#confirmDialog').close(); showToast('Înregistrarea a fost ștearsă.');
}

function showToast(message) {
  const toast = $('#toast');
  $('p', toast).textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function currentView() { const hash = location.hash.replace('#', ''); return ['acasa', 'clasament', 'istoric', 'admin'].includes(hash) ? hash : 'acasa'; }
function syncNavigation() {
  const view = currentView();
  $$('.view').forEach(section => section.classList.toggle('active', section.dataset.view === view));
  $$('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-open-add]')) openAdd();
  if (event.target.closest('[data-open-admin]')) location.hash = 'admin';
  const edit = event.target.closest('[data-edit]');
  if (edit) openAdd(state.entries.find(entry => entry.id === edit.dataset.edit));
  const remove = event.target.closest('[data-delete]');
  if (remove) { pendingDeleteId = remove.dataset.delete; $('#confirmDialog').showModal(); }
  const quick = event.target.closest('[data-minutes]');
  if (quick) $('#minutesInput').value = quick.dataset.minutes;
});

$('#lateForm').addEventListener('submit', handleSave);
$('#confirmDelete').addEventListener('click', event => { event.preventDefault(); deleteEntry(); });
$('#historyMonth').addEventListener('change', renderHistory);
$('#resetDemo').addEventListener('click', () => { state = { entries: demoEntries.map(entry => ({ ...entry })), theme: state.theme }; saveState(); renderAll(); showToast('Datele demo au fost restaurate.'); });
$('#themeToggle').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; document.body.classList.toggle('dark', state.theme === 'dark'); saveState(); });
window.addEventListener('hashchange', syncNavigation);

document.body.classList.toggle('dark', state.theme === 'dark');
renderAll();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
