import { escapeHtml, renderCitedText, renderSourceCards } from './citations.js';
import {
  ROADMAP_GROUPS,
  computeFilterCounts,
  filterAndSortTrophies,
  formatCounter,
  getCounterValue,
  isTrophyMasked,
} from './filters.js';
import { checkIconSvg, gradeLabel, lockIconSvg, suncoastMarkSvg } from './icons.js';
import {
  createEmptyState,
  createShotDemoState,
  loadProgress,
  parseBackupJson,
  saveProgress,
  serializeBackup,
} from './storage.js';

const FILTER_DEFS = [
  { id: 'all', label: 'All' },
  { id: 'story', label: 'Story' },
  { id: 'missable', label: 'Missable', cls: 'is-warn' },
  { id: 'unconfirmed', label: 'Unconfirmed', cls: 'is-unconf' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'activities', label: 'Activities' },
  { id: 'side', label: 'Side' },
  { id: 'crime', label: 'Crime' },
  { id: 'misc', label: 'Misc' },
  { id: 'online', label: 'Online' },
  { id: 'todo', label: 'To do' },
];

const STAGE_IDS = ['all', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

let appData = null;
let state = createEmptyState();
let ui = {
  tab: 'checklist',
  category: 'all',
  stage: 'all',
  grade: 'all',
  sort: 'roadmap',
  search: '',
  selectedId: 28,
  selectedStoryId: 4,
  backupMessage: '',
  backupError: false,
  shotMode: null,
};

function persist() {
  state.updatedAt = new Date().toISOString();
  if (!ui.shotMode) saveProgress(state);
  const el = document.getElementById('save-status');
  if (el) el.textContent = 'Saved locally';
}

function toggleEarned(trophyId) {
  const idx = state.earned.indexOf(trophyId);
  const trophy = appData.trophies.find((t) => t.id === trophyId);
  if (idx === -1) {
    state.earned.push(trophyId);
    state.earned.sort((a, b) => a - b);
    if (trophy && trophy.target > 1) state.counters[trophyId] = trophy.target;
  } else {
    state.earned.splice(idx, 1);
    if (trophy && trophy.target > 1 && state.counters[trophyId] === trophy.target) {
      state.counters[trophyId] = Math.max(0, trophy.target - (trophy.step || 1));
    }
  }
  persist();
  renderAll();
}

function stepCounter(trophyId, delta) {
  const trophy = appData.trophies.find((t) => t.id === trophyId);
  if (!trophy || trophy.target <= 1) return;
  const step = trophy.step || 1;
  const current = getCounterValue(trophy, state);
  const next = Math.max(0, Math.min(trophy.target, current + delta * step));
  if (next === 0) delete state.counters[trophyId];
  else state.counters[trophyId] = next;

  const isEarned = state.earned.includes(trophyId);
  if (next >= trophy.target && !isEarned) {
    state.earned.push(trophyId);
    state.earned.sort((a, b) => a - b);
  } else if (next < trophy.target && isEarned) {
    state.earned = state.earned.filter((id) => id !== trophyId);
  }
  persist();
  renderAll();
}

function revealTrophy(trophyId) {
  if (!state.revealed.includes(trophyId)) {
    state.revealed.push(trophyId);
    state.revealed.sort((a, b) => a - b);
    persist();
    renderAll();
  }
}

function hideTrophy(trophyId) {
  state.revealed = state.revealed.filter((id) => id !== trophyId);
  persist();
  renderAll();
}

function renderTopbar() {
  const trophies = appData.trophies;
  const earnedSet = new Set(state.earned);
  const total = trophies.length;
  const earned = earnedSet.size;
  const pct = Math.round((earned / total) * 100);

  const countByGrade = (g) => {
    const list = trophies.filter((t) => t.grade === g);
    const done = list.filter((t) => earnedSet.has(t.id)).length;
    return `${done}/${list.length}`;
  };

  document.getElementById('progress-count').textContent = `${earned} / ${total} · ${pct}%`;
  document.getElementById('grade-ledger').textContent = `P ${countByGrade('platinum')} · G ${countByGrade('gold')} · S ${countByGrade('silver')} · B ${countByGrade('bronze')} · 0 Online`;
  document.getElementById('progress-bar-fill').style.width = `${pct}%`;

  const spoilerBtn = document.getElementById('spoiler-toggle');
  spoilerBtn.setAttribute('aria-pressed', String(state.hideStorySpoilers));
  document.getElementById('spoiler-toggle-label').textContent = state.hideStorySpoilers
    ? 'Spoilers: Hidden until earned'
    : 'Spoilers: All revealed';

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === ui.tab;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  const stageWrap = document.getElementById('stage-pills');
  stageWrap.innerHTML = STAGE_IDS.map((sid) => {
    const active = ui.stage === sid ? ' is-active' : '';
    const label = sid === 'all' ? 'All' : sid;
    return `<button type="button" class="stage-pill${active}" data-stage="${sid}">${label}</button>`;
  }).join('');
}

function renderFilterBar() {
  const counts = computeFilterCounts(appData.trophies, state);
  const el = document.getElementById('filter-pills');
  el.innerHTML = FILTER_DEFS.map((f) => {
    const active = ui.category === f.id ? ' is-active' : '';
    const cls = f.cls ? ` ${f.cls}` : '';
    return `<button type="button" class="filter-pill${cls}${active}" data-cat="${f.id}">
      <span>${f.label}</span>
      <span class="pill-count">${counts[f.id]}</span>
    </button>`;
  }).join('');
}

function renderTrophyRow(t, isSelected, compactStoryMode = false) {
  const earned = state.earned.includes(t.id);
  const masked = isTrophyMasked(t, state);
  const val = getCounterValue(t, state);

  const titleHtml = masked
    ? `<span class="row-title is-masked">${lockIconSvg()} ${compactStoryMode ? `Hidden story trophy · ${t.stage}` : 'Story trophy — hidden until earned'}</span>`
    : `<span class="row-title">${escapeHtml(t.name)}</span>`;

  const descHtml = masked
    ? `<div class="row-desc">Protected by Story Spoiler Shield until earned or revealed.</div>`
    : `<div class="row-desc">${escapeHtml(t.description)}</div>`;

  const badges = [];
  badges.push(`<span class="badge badge-${t.grade}">${gradeLabel(t.grade)}</span>`);
  if (!masked && t.missable === 'possible') {
    badges.push(`<span class="badge badge-missable">Possibly Missable</span>`);
  }
  if (!masked && t.unconfirmed) {
    badges.push(`<span class="badge badge-unconf">Unconfirmed</span>`);
  }
  if (!masked && t.target > 1 && !earned) {
    badges.push(`<span class="counter-chip">${formatCounter(t, val)}</span>`);
  }
  if (masked) {
    badges.push(`<button type="button" class="btn btn-ghost btn-xs" data-reveal="${t.id}">Reveal</button>`);
  }

  return `<div class="trophy-row${isSelected ? ' is-selected' : ''}${earned ? ' is-earned' : ''}" data-select="${t.id}" role="button" tabindex="0">
    <button type="button" class="check-btn${earned ? ' is-earned' : ''}" data-toggle-earned="${t.id}" aria-label="${earned ? 'Mark unearned' : 'Mark earned'}" aria-pressed="${earned}">
      ${earned ? checkIconSvg() : ''}
    </button>
    <div class="row-body">
      <div class="row-top">${titleHtml}</div>
      ${descHtml}
    </div>
    <div class="row-right">${badges.join('')}</div>
  </div>`;
}

function renderChecklistPane() {
  const listEl = document.getElementById('trophy-list-pane');
  const items = filterAndSortTrophies(appData.trophies, state, ui);

  if (items.length === 0) {
    const emptyMsg =
      ui.category === 'online'
        ? '0 online trophies — all 55 Grand Theft Auto VI (PS5) trophies are 100% offline single-player.'
        : 'No trophies match the current filter or search query.';
    listEl.innerHTML = `<div class="empty-state">${escapeHtml(emptyMsg)}</div>`;
    renderDetailPane(null);
    return;
  }

  if (!items.some((t) => t.id === ui.selectedId)) {
    ui.selectedId = items[0].id;
  }

  if (ui.sort === 'roadmap' && ui.stage === 'all') {
    let html = '';
    for (const grp of ROADMAP_GROUPS) {
      const grpItems = items.filter((t) => t.stage === grp.id);
      if (grpItems.length === 0) continue;
      const done = grpItems.filter((t) => state.earned.includes(t.id)).length;
      html += `<div class="group-header${grp.isGoal ? ' is-goal' : ''}">
        <span>${escapeHtml(grp.title)}</span>
        <span class="mono">${done}/${grpItems.length}</span>
      </div>`;
      html += grpItems.map((t) => renderTrophyRow(t, t.id === ui.selectedId)).join('');
    }
    listEl.innerHTML = html;
  } else {
    listEl.innerHTML = items.map((t) => renderTrophyRow(t, t.id === ui.selectedId)).join('');
  }

  const selected = items.find((t) => t.id === ui.selectedId) || items[0];
  renderDetailPane(selected);
}

function renderDetailPane(t) {
  const el = document.getElementById('detail-pane');
  if (!t) {
    el.innerHTML = `<div class="empty-state">Select a trophy to inspect its cited walkthrough and sources.</div>`;
    return;
  }

  const earned = state.earned.includes(t.id);
  const masked = isTrophyMasked(t, state);

  if (masked) {
    el.innerHTML = `
      <div class="guard-box">
        <div class="detail-badges" style="margin-bottom:8px">
          <span class="badge badge-${t.grade}">${gradeLabel(t.grade)}</span>
          <span class="badge badge-stage">${t.stage}</span>
          <span class="badge badge-stage">Story · Hidden on PSN</span>
        </div>
        <h2 class="guard-title">${lockIconSvg()} Story Spoiler Shield Active</h2>
        <p class="guard-copy">This unearned story trophy's name, official PlayStation description, and walkthrough steps are hidden to prevent campaign spoilers. Revealing uncovers only this trophy without marking it earned.</p>
        <div class="guard-actions">
          <button type="button" class="btn btn-coral" data-reveal="${t.id}">Reveal this trophy</button>
          <button type="button" class="btn btn-primary" data-toggle-earned="${t.id}">Mark earned</button>
        </div>
      </div>`;
    return;
  }

  const val = getCounterValue(t, state);
  const pct = Math.min(100, Math.round((val / t.target) * 100));
  const counterHtml =
    t.target > 1
      ? `<div class="detail-section">
          <div class="section-label">Progress Counter (Saved Locally)</div>
          <div class="counter-panel">
            <div class="counter-controls">
              <button type="button" class="step-btn" data-step-id="${t.id}" data-step-delta="-1" aria-label="Decrease progress">&minus;</button>
              <span class="counter-readout mono" id="detail-counter-readout">${formatCounter(t, val)}</span>
              <button type="button" class="step-btn" data-step-id="${t.id}" data-step-delta="1" aria-label="Increase progress">+</button>
            </div>
            <div class="counter-bar-wrap">
              <div class="counter-bar-track"><div class="counter-bar-fill" style="width:${pct}%"></div></div>
            </div>
            <span class="mono" style="font-size:11.5px;font-weight:700;color:var(--ink-2)">${pct}%</span>
          </div>
        </div>`
      : '';

  const missableTitle =
    t.missable === 'possible' ? 'Can It Be Missed? — Possibly Missable' : 'Can It Be Missed? — No';
  const missableBox = `<div class="callout-box${t.missable === 'possible' ? ' is-missable' : ''}">
      <div class="callout-head">${missableTitle}</div>
      <div>${renderCitedText(t.missableNote)}</div>
    </div>`;

  const unconfBox = t.unconfirmedNote
    ? `<div class="callout-box is-unconf">
        <div class="callout-head">${t.unconfirmed ? 'Not Confirmed at Launch' : 'Not Confirmed at Launch · Status'}</div>
        <div>${renderCitedText(t.unconfirmedNote)}</div>
      </div>`
    : '';

  const calloutsHtml = `<div class="detail-section">
    <div class="callout-grid${unconfBox ? '' : ' is-single'}">${missableBox}${unconfBox}</div>
  </div>`;

  const revealBackBtn =
    state.hideStorySpoilers && t.kind === 'story' && !earned && state.revealed.includes(t.id)
      ? `<button type="button" class="btn btn-ghost btn-xs" data-hide="${t.id}">Re-hide</button>`
      : '';

  el.innerHTML = `
    <div class="detail-head">
      <div>
        <h2 class="detail-title">${escapeHtml(t.name)}</h2>
        <div class="detail-badges">
          <span class="badge badge-${t.grade}">${gradeLabel(t.grade)}</span>
          <span class="badge badge-stage">${t.stage}</span>
          <span class="badge badge-stage">${escapeHtml(t.kind)}</span>
          <span class="badge badge-stage">${t.hidden ? 'Hidden on PSN' : 'Visible on PSN'}</span>
          ${t.missable === 'possible' ? '<span class="badge badge-missable">Possibly Missable</span>' : ''}
          ${t.unconfirmed ? '<span class="badge badge-unconf">Unconfirmed</span>' : ''}
        </div>
      </div>
      <div class="row-right">
        ${revealBackBtn}
        <button type="button" class="btn ${earned ? 'btn-primary' : ''}" data-toggle-earned="${t.id}">
          ${earned ? 'Earned &#10003;' : 'Mark earned'}
        </button>
      </div>
    </div>

    <div class="detail-section">
      <div class="section-label">Official PlayStation 5 Description</div>
      <blockquote class="official-quote">${escapeHtml(t.description)}</blockquote>
    </div>

    ${counterHtml}

    <div class="detail-section">
      <div class="section-label">Original Cited Walkthrough</div>
      <p class="guide-prose">${renderCitedText(t.guide)}</p>
    </div>

    <div class="detail-section">
      <div class="section-label">Action Steps</div>
      <ol class="steps-list">
        ${t.steps.map((step) => `<li>${renderCitedText(step)}</li>`).join('')}
      </ol>
    </div>

    ${calloutsHtml}

    <div class="detail-section">
      <div class="section-label">Sources (${t.sources.length}) — External Links Open Only When Clicked</div>
      ${renderSourceCards(t.sources, appData.sourcesCatalog)}
    </div>`;
}

function renderSpoilersView() {
  const container = document.getElementById('view-spoilers');
  const stageOrder = { S1: 1, S2: 2, S3: 3, S4: 4, S5: 5 };
  const storyTrophies = appData.trophies
    .filter((t) => t.kind === 'story')
    .sort((a, b) => {
      const sa = stageOrder[a.stage] || 9;
      const sb = stageOrder[b.stage] || 9;
      if (sa !== sb) return sa - sb;
      if (a.stage === 'S2') return (a.id === 8 ? 0 : 1) - (b.id === 8 ? 0 : 1);
      return a.id - b.id;
    });
  const storyEarned = storyTrophies.filter((t) => state.earned.includes(t.id)).length;
  const maskedCount = storyTrophies.filter((t) => isTrophyMasked(t, state)).length;

  const selectedStory =
    storyTrophies.find((t) => t.id === ui.selectedStoryId) ||
    storyTrophies.find((t) => isTrophyMasked(t, state)) ||
    storyTrophies[0];
  ui.selectedStoryId = selectedStory.id;

  const selectedMasked = isTrophyMasked(selectedStory, state);
  const selectedEarned = state.earned.includes(selectedStory.id);

  const guardCardHtml = selectedMasked
    ? `<div class="guard-box">
        <div class="detail-badges" style="margin-bottom:8px">
          <span class="badge badge-${selectedStory.grade}">${gradeLabel(selectedStory.grade)}</span>
          <span class="badge badge-stage">${selectedStory.stage}</span>
          <span class="badge badge-stage">Hidden Story Trophy</span>
        </div>
        <h2 class="guard-title">${lockIconSvg()} Story Spoiler Guard — ${selectedStory.stage}</h2>
        <p class="guard-copy">Name, official PlayStation description, and mission steps are masked everywhere (Checklist, Roadmap, Next Up, and Search) until earned or manually uncovered.</p>
        <div class="guard-actions">
          <button type="button" class="btn btn-coral" data-reveal="${selectedStory.id}">Reveal this trophy</button>
          <button type="button" class="btn btn-primary" data-toggle-earned="${selectedStory.id}">Mark earned</button>
        </div>
      </div>`
    : `<div class="card-panel">
        <div class="detail-head" style="padding-bottom:8px">
          <div>
            <div class="section-label">Selected Story Trophy (${selectedEarned ? 'Earned' : 'Manually Revealed'})</div>
            <h2 class="detail-title" style="font-size:17px;margin-bottom:4px">${escapeHtml(selectedStory.name)}</h2>
            <div class="detail-badges">
              <span class="badge badge-${selectedStory.grade}">${gradeLabel(selectedStory.grade)}</span>
              <span class="badge badge-stage">${selectedStory.stage}</span>
            </div>
          </div>
          <div class="row-right">
            ${!selectedEarned && state.hideStorySpoilers ? `<button type="button" class="btn btn-ghost btn-xs" data-hide="${selectedStory.id}">Re-hide spoiler</button>` : ''}
            <button type="button" class="btn ${selectedEarned ? 'btn-primary' : ''}" data-toggle-earned="${selectedStory.id}">${selectedEarned ? 'Earned &#10003;' : 'Mark earned'}</button>
          </div>
        </div>
        <blockquote class="official-quote" style="margin-top:8px">${escapeHtml(selectedStory.description)}</blockquote>
        <p class="guide-prose" style="margin-top:8px">${renderCitedText(selectedStory.guide)}</p>
      </div>`;

  const bannerHtml = ui.backupMessage
    ? `<div class="status-banner${ui.backupError ? ' is-error' : ''}" id="backup-status-banner">${escapeHtml(ui.backupMessage)}</div>`
    : '';

  const previewJson = serializeBackup(state);

  container.innerHTML = `
    <div class="spoilers-layout">
      <div class="trophy-list-pane" style="max-height:calc(100vh - 122px)">
        <div class="group-header is-goal">
          <span>Story Filter (${storyTrophies.length}) · Spoiler Shield ${state.hideStorySpoilers ? 'ON' : 'OFF'}</span>
          <span class="mono">${storyEarned}/${storyTrophies.length} earned · ${maskedCount} masked</span>
        </div>
        ${storyTrophies
          .map((t) => renderTrophyRow(t, t.id === ui.selectedStoryId, true))
          .join('')}
      </div>

      <div class="spoilers-right">
        ${guardCardHtml}
        <section class="card-panel" aria-label="Offline Backup and Transfer">
          <div class="detail-head" style="padding-bottom:8px">
            <div>
              <div class="section-label">100% Offline LocalStorage Backup</div>
              <h2 class="detail-title" style="font-size:16px;margin:0">Offline Backup &amp; Transfer (JSON)</h2>
            </div>
            <div class="io-actions">
              <button type="button" class="btn btn-primary btn-xs" id="btn-export-panel">Export JSON</button>
              <button type="button" class="btn btn-xs" id="btn-import-panel">Import JSON</button>
              <button type="button" class="btn btn-danger-ghost btn-xs" id="btn-reset-panel">Reset</button>
            </div>
          </div>
          <p class="row-desc" style="margin-top:6px;font-size:12px">Export <code>suncoast-progress.json</code> to back up earned trophies, counters, and spoiler settings across browsers with zero cloud or network calls.</p>
          ${bannerHtml}
          <pre class="json-preview" aria-label="suncoast-progress.json preview">${escapeHtml(previewJson)}</pre>
        </section>
      </div>
    </div>`;
}

let roadmapMod = null;

async function ensureRoadmapRendered() {
  if (!roadmapMod) roadmapMod = await import('./roadmap.js');
  if (ui.tab === 'roadmap') {
    roadmapMod.renderRoadmapView(document.getElementById('view-roadmap'), appData, state);
  }
}

function renderViews() {
  document.getElementById('view-checklist').hidden = ui.tab !== 'checklist';
  document.getElementById('view-roadmap').hidden = ui.tab !== 'roadmap';
  document.getElementById('view-spoilers').hidden = ui.tab !== 'spoilers';

  if (ui.tab === 'checklist') {
    renderFilterBar();
    renderChecklistPane();
  } else if (ui.tab === 'roadmap') {
    if (roadmapMod) {
      roadmapMod.renderRoadmapView(document.getElementById('view-roadmap'), appData, state);
    } else {
      ensureRoadmapRendered();
    }
  } else if (ui.tab === 'spoilers') {
    renderSpoilersView();
  }
}

function renderAll() {
  renderTopbar();
  renderViews();
}

function exportJsonFile() {
  const content = serializeBackup(state);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'suncoast-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  const activeCounters = Object.keys(state.counters).length;
  ui.backupError = false;
  ui.backupMessage = `Exported ${state.earned.length} earned · ${activeCounters} counters · suncoast-progress.json`;
  if (ui.tab === 'spoilers') renderSpoilersView();
}

function triggerImportPicker() {
  const input = document.getElementById('import-file-input');
  input.value = '';
  input.click();
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const next = parseBackupJson(String(reader.result || ''), appData.trophies);
      state = next;
      persist();
      const activeCounters = Object.keys(state.counters).length;
      ui.backupError = false;
      ui.backupMessage = `Imported ${state.earned.length} earned · ${activeCounters} counters · Saved locally`;
      renderAll();
    } catch (err) {
      ui.backupError = true;
      ui.backupMessage = err instanceof Error ? err.message : 'Failed to parse backup JSON.';
      renderAll();
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  state = createEmptyState();
  persist();
  ui.backupError = false;
  ui.backupMessage = 'Progress reset to 0 / 55 · Saved locally';
  renderAll();
}

function bindEvents() {
  document.getElementById('spoiler-toggle').addEventListener('click', () => {
    state.hideStorySpoilers = !state.hideStorySpoilers;
    persist();
    renderAll();
  });

  document.getElementById('btn-export-top').addEventListener('click', exportJsonFile);
  document.getElementById('btn-import-top').addEventListener('click', triggerImportPicker);
  document.getElementById('btn-reset-top').addEventListener('click', resetProgress);
  document.getElementById('import-file-input').addEventListener('change', (e) => {
    handleImportFile(e.target.files && e.target.files[0]);
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.tab = btn.dataset.tab;
      renderAll();
    });
  });

  document.getElementById('stage-pills').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-stage]');
    if (!btn) return;
    ui.stage = btn.dataset.stage;
    ui.tab = 'checklist';
    renderAll();
  });

  document.getElementById('filter-pills').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    ui.category = btn.dataset.cat;
    renderAll();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    ui.search = e.target.value;
    renderChecklistPane();
  });

  document.getElementById('grade-select').addEventListener('change', (e) => {
    ui.grade = e.target.value;
    renderChecklistPane();
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    ui.sort = e.target.value;
    renderChecklistPane();
  });

  document.getElementById('workspace').addEventListener('click', (e) => {
    const exportBtn = e.target.closest('#btn-export-panel');
    if (exportBtn) return exportJsonFile();
    const importBtn = e.target.closest('#btn-import-panel');
    if (importBtn) return triggerImportPicker();
    const resetBtn = e.target.closest('#btn-reset-panel');
    if (resetBtn) return resetProgress();

    const toggleBtn = e.target.closest('[data-toggle-earned]');
    if (toggleBtn) {
      e.stopPropagation();
      toggleEarned(Number(toggleBtn.dataset.toggleEarned));
      return;
    }

    const revealBtn = e.target.closest('[data-reveal]');
    if (revealBtn) {
      e.stopPropagation();
      revealTrophy(Number(revealBtn.dataset.reveal));
      return;
    }

    const hideBtn = e.target.closest('[data-hide]');
    if (hideBtn) {
      e.stopPropagation();
      hideTrophy(Number(hideBtn.dataset.hide));
      return;
    }

    const stepBtn = e.target.closest('[data-step-id]');
    if (stepBtn) {
      e.stopPropagation();
      stepCounter(Number(stepBtn.dataset.stepId), Number(stepBtn.dataset.stepDelta));
      return;
    }

    const filterStageBtn = e.target.closest('[data-filter-stage]');
    if (filterStageBtn) {
      ui.stage = filterStageBtn.dataset.filterStage;
      ui.category = 'all';
      ui.tab = 'checklist';
      renderAll();
      return;
    }

    const openTrophyEl = e.target.closest('[data-open-trophy]');
    if (openTrophyEl) {
      ui.selectedId = Number(openTrophyEl.dataset.openTrophy);
      ui.stage = 'all';
      ui.category = 'all';
      ui.grade = 'all';
      ui.search = '';
      document.getElementById('search-input').value = '';
      document.getElementById('grade-select').value = 'all';
      ui.tab = 'checklist';
      renderAll();
      return;
    }

    const row = e.target.closest('[data-select]');
    if (row) {
      const id = Number(row.dataset.select);
      if (ui.tab === 'spoilers') {
        ui.selectedStoryId = id;
        renderSpoilersView();
      } else {
        ui.selectedId = id;
        renderChecklistPane();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (ui.tab !== 'checklist') {
        ui.tab = 'checklist';
        renderAll();
      }
      document.getElementById('search-input').focus();
    }
  });
}

async function init() {
  document.getElementById('brand-mark').innerHTML = suncoastMarkSvg();
  const res = await fetch('data/trophies.json');
  appData = await res.json();

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot === 'tracker' || shot === 'roadmap' || shot === 'spoilers') {
    ui.shotMode = shot;
    state = createShotDemoState();
    if (shot === 'tracker') {
      ui.tab = 'checklist';
      ui.selectedId = 28;
    } else if (shot === 'roadmap') {
      ui.tab = 'roadmap';
    } else if (shot === 'spoilers') {
      ui.tab = 'spoilers';
      ui.selectedStoryId = 4;
      ui.backupMessage = 'Imported 17 earned · 9 counters · Saved locally';
    }
  } else {
    state = loadProgress(appData.trophies);
  }

  bindEvents();
  renderAll();
  if (ui.tab === 'roadmap') await ensureRoadmapRendered();
}

init();
