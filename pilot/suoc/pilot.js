'use strict';
const $ = id => document.getElementById(id);
const status = { paused: ['🟡 Čeka pokretanje / pauzirano', 'wait'], queued: ['🔵 U redu za izvršavanje', 'active'], running: ['🔵 Izvršavanje u toku', 'active'], succeeded: ['🟢 Potvrđeno završeno', 'done'], failed: ['🔴 Neuspešno', 'blocked'], interrupted: ['🔴 Prekinuto — proverite pa ponovite', 'blocked'], canceled: ['🟡 Otkazano', 'wait'] };
let selected = '', refreshing = false, lastList = '';
async function api(path, method = 'GET', value) {
  const response = await fetch(path, { method, headers: { 'X-SUOC-Pilot': '1', ...(value === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(value === undefined ? {} : { body: JSON.stringify(value) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Zahtev nije uspeo.');
  return data;
}
function showError(error) { $('error').textContent = error.message; $('error').hidden = false; }
async function action(fn) { $('error').hidden = true; try { await fn(); await refresh(); } catch (error) { showError(error); } }
function badge(node, value) { const item = status[value] || [value, 'wait']; node.textContent = item[0]; node.className = `badge ${item[1]}`; }
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    await api('/api/status'); $('health').textContent = '🟢 Lokalni servis je dostupan';
    const runs = await api('/api/runs');
    const list = $('runs'), signature = JSON.stringify(runs);
    if (signature !== lastList) {
      list.replaceChildren(); lastList = signature;
      if (!runs.length) list.textContent = 'Još nema sačuvanih zadataka.';
      for (const run of runs) {
        const button = document.createElement('button'); button.className = 'run';
        const name = document.createElement('strong'); name.textContent = run.name;
        const state = document.createElement('span'); badge(state, run.status);
        button.append(name, state); button.onclick = () => action(async () => { selected = run.id; }); list.append(button);
      }
    }
    if (!selected && runs.length) selected = runs[0].id;
    if (selected) {
      const data = await api(`/api/runs/${selected}`), run = data.run;
      $('detail').hidden = false; $('detail-title').textContent = run.name; badge($('run-status'), run.status);
      const done = run.steps.filter(step => step.status === 'succeeded').length;
      $('progress').textContent = `${done}/${run.steps.length} uspešnih koraka = ${Math.round(done / run.steps.length * 100)}% ovog zadatka.`;
      const steps = $('steps'); steps.replaceChildren();
      for (const step of run.steps) {
        const card = document.createElement('article'), title = document.createElement('h3'), state = document.createElement('p'), detail = document.createElement('p');
        title.textContent = `${step.id} · ${step.request.name}`; badge(state, step.status);
        detail.textContent = `Pokušaji: ${step.attempts}/3. Zavisnosti: ${step.dependsOn.join(', ') || 'nema'}.${step.result ? ` Rezultat: ${step.result.output}.` : ''}${step.error ? ` ${step.error}` : ''}`;
        card.append(title, state, detail); steps.append(card);
      }
      for (const button of $('controls').querySelectorAll('button')) {
        const retry = ['failed', 'interrupted'].includes(run.status);
        button.disabled = button.dataset.action === 'retry' ? !retry : !['paused', 'queued'].includes(run.status);
      }
      $('json').textContent = JSON.stringify(data, null, 2);
    }
  } catch (error) { $('health').textContent = '🔴 Servis ili radnik nije dostupan — proverite poruku'; showError(error); }
  finally { refreshing = false; }
}
$('example').onclick = () => action(async () => { $('plan').value = JSON.stringify(await api('/api/example'), null, 2); });
$('create').onclick = () => action(async () => { const run = await api('/api/runs', 'POST', JSON.parse($('plan').value)); selected = run.id; });
$('refresh').onclick = () => void refresh();
for (const button of $('controls').querySelectorAll('button')) button.onclick = () => action(() => api(`/api/runs/${selected}/${button.dataset.action}`, 'POST'));
void action(async () => { $('plan').value = JSON.stringify(await api('/api/example'), null, 2); });
setInterval(() => void refresh(), 1500);
