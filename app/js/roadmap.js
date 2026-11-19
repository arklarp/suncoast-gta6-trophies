import { escapeHtml, renderCitedText } from './citations.js';
import { formatCounter, getCounterValue, isTrophyMasked } from './filters.js';

const ROADMAP_SOURCES = [
  { num: 1, key: 'ppx_guide', short: 'PowerPyx Guide & Meditations', backs: '~200h, 4/10 diff, 15 saves, no replay, 100% thresholds, Ch.1 balcony prompt.' },
  { num: 2, key: 'outlag', short: 'OutputLag Trophy Guide', backs: 'Missable alert, no difficulty/medal lock, launch-unconfirmed triggers.' },
  { num: 3, key: 'exophase', short: 'Exophase & PSNProfiles Lists', backs: 'Official 55 PS5 trophies, 28 hidden, 0 online, verbatim counts.' },
  { num: 4, key: 'gtabase', short: 'GTABase Leonida Hub', backs: 'Named Stranger strands and multi-day chapter callback pacing.' },
  { num: 5, key: 'pushsq', short: 'Push Square Roadmap', backs: 'Early Keys activities & VCIA free-roam checks.' },
];

function pickNextUp(trophies, state) {
  const earnedSet = new Set(state.earned);
  const pma = trophies.find((t) => t.id === 28);
  if (pma && !earnedSet.has(pma.id)) {
    const val = getCounterValue(pma, state);
    return {
      trophyId: pma.id,
      text: `Positive Mental Attitude (${val}/${pma.target}) — Stage 1: finish Lucia's balcony meditation after Down to Earth before leaving Ch.1[1][2].`,
    };
  }
  const firstOpen = trophies.find((t) => !earnedSet.has(t.id) && !isTrophyMasked(t, state));
  if (firstOpen) {
    const countBit = firstOpen.target > 1 ? ` (${formatCounter(firstOpen, getCounterValue(firstOpen, state))})` : '';
    return {
      trophyId: firstOpen.id,
      text: `${firstOpen.name}${countBit} — ${firstOpen.stage}: continue your active roadmap cleanup[1].`,
    };
  }
  const maskedOpen = trophies.find((t) => !earnedSet.has(t.id));
  if (maskedOpen) {
    return {
      trophyId: maskedOpen.id,
      text: `Hidden story milestone in ${maskedOpen.stage} — advance the campaign with rotating manual saves[1].`,
    };
  }
  return {
    trophyId: 1,
    text: `All 55 trophies earned — Vice Got a Price! Leonida Platinum complete[1][3].`,
  };
}

export function renderRoadmapView(container, data, state) {
  const { trophies, stages, sourcesCatalog } = data;
  const earnedSet = new Set(state.earned);
  const nextUp = pickNextUp(trophies, state);

  const missables = trophies
    .filter((t) => t.missable === 'possible')
    .sort((a, b) => (a.id === 28 ? -1 : b.id === 28 ? 1 : a.id - b.id));
  const unconfirmed = trophies.filter((t) => t.unconfirmed === true);

  const specsHtml = `
    <div class="specs-bar" aria-label="Platinum roadmap specifications">
      <span class="spec-chip mono">${renderCitedText('~200h[1]')}</span>
      <span class="spec-chip mono">${renderCitedText('4/10 Diff[1]')}</span>
      <span class="spec-chip">${renderCitedText('1 Playthrough[1]')}</span>
      <span class="spec-chip">${renderCitedText('0 Online[1][3]')}</span>
      <span class="spec-chip">${renderCitedText('No Mission Replay[1]')}</span>
      <span class="spec-chip">${renderCitedText('15 Save Slots[1]')}</span>
      <span class="spec-chip">${renderCitedText('Cheats Off[1]')}</span>
      <span class="spec-chip is-warn">${renderCitedText('1–2 Missable · 5 Unconfirmed[1][2]')}</span>
    </div>`;

  const nextUpHtml = `
    <div class="next-up-banner">
      <div class="next-up-copy">
        <span class="next-up-tag">NEXT UP</span>${renderCitedText(nextUp.text)}
      </div>
      <button type="button" class="btn btn-coral btn-xs" data-open-trophy="${nextUp.trophyId}">Open in Checklist &rarr;</button>
    </div>`;

  const stagesHtml = `<div class="stages-grid">${stages
    .map((st, idx) => {
      const stageTrophies = trophies.filter((t) => t.stage === st.id);
      const stageEarned = stageTrophies.filter((t) => earnedSet.has(t.id)).length;
      const fullSpan = idx === stages.length - 1 ? ' is-full-span' : '';
      return `<article class="stage-card${fullSpan}">
        <div class="stage-head">
          <span class="stage-title">${escapeHtml(st.code)} · ${escapeHtml(st.label)}</span>
          <span class="stage-meta mono">${stageEarned}/${stageTrophies.length} earned · ${escapeHtml(st.est)}</span>
        </div>
        <p class="stage-summary">${renderCitedText(st.summary)}</p>
        <div class="stage-foot">
          <span class="stage-focus">${renderCitedText(st.focus)}</span>
          <button type="button" class="btn btn-ghost btn-xs" data-filter-stage="${st.id}">Filter ${st.id} &rarr;</button>
        </div>
      </article>`;
    })
    .join('')}</div>`;

  const sourcesHtml = `
    <section class="roadmap-sources-card" aria-label="Roadmap and watchlist sources">
      <div class="section-label">How This Roadmap &amp; Watchlist Are Built · Sources</div>
      <div class="roadmap-sources-list">
        ${ROADMAP_SOURCES.map((s) => {
          const meta = sourcesCatalog[s.key] || { url: '#' };
          return `<div><span class="source-num">[${s.num}]</span> <a class="source-link" href="${escapeHtml(meta.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.short)}</a> — ${escapeHtml(s.backs)}</div>`;
        }).join('')}
      </div>
    </section>`;

  const missableCardsHtml = missables
    .map((t) => {
      const countChip = t.target > 1 ? `<span class="counter-chip">${formatCounter(t, getCounterValue(t, state))}</span>` : '';
      const brief =
        t.id === 28
          ? "Ch. 1 balcony after Down to Earth (L2 + Accept); 18/18 meditations, no mission replay[1][2]."
          : 'Complete 8 Leonida stranger strands; start purple icons early & keep chapter saves[1][4].';
      return `<article class="watch-card is-missable" data-open-trophy="${t.id}" tabindex="0">
        <div class="watch-card-top">
          <span class="watch-card-name">${escapeHtml(t.name)}</span>
          <span class="row-right"><span class="badge badge-stage">${t.stage}</span>${countChip}</span>
        </div>
        <div class="watch-card-note">${renderCitedText(brief)}</div>
      </article>`;
    })
    .join('');

  const unconfBriefs = {
    44: 'Cocktail with Ocean Beach view — exact terrace/venue trigger unverified[2][3].',
    45: 'Smash out of vehicle showroom — exact dealership/car check pending[2][3].',
    49: '"Second time\'s the charm" — exact retry mishap unconfirmed at launch[2][3].',
    50: '"What the hell just happened?" — UFO/paranormal spawn window pending[2][3].',
    51: 'Melee drive-by knockdown — single vs multi-hit rule pending[2][3].',
  };

  const unconfCardsHtml = unconfirmed
    .map((t) => {
      return `<article class="watch-card is-unconf" data-open-trophy="${t.id}" tabindex="0">
        <div class="watch-card-top">
          <span class="watch-card-name">${escapeHtml(t.name)}</span>
          <span class="badge badge-unconf">Unconfirmed</span>
        </div>
        <div class="watch-card-note">${renderCitedText(unconfBriefs[t.id] || t.description)}</div>
      </article>`;
    })
    .join('');

  container.innerHTML = `
    <div class="roadmap-layout">
      <div class="roadmap-main">
        ${specsHtml}
        ${nextUpHtml}
        ${stagesHtml}
        ${sourcesHtml}
      </div>
      <aside class="roadmap-sidebar" aria-label="Missable and unconfirmed trophy watchlist">
        <h2 class="watch-section-head is-missable">${renderCitedText('Potentially Missable (2) — Keep Manual Saves[1][2]')}</h2>
        ${missableCardsHtml}
        <h2 class="watch-section-head is-unconf" style="margin-top:4px">${renderCitedText('Unconfirmed at Launch (5) — Honest Status[2][3]')}</h2>
        ${unconfCardsHtml}
      </aside>
    </div>`;
}
