const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

export const ROADMAP_GROUPS = [
  { id: 'S7', title: 'Goal · 100% & The Platinum', isGoal: true },
  { id: 'S1', title: 'Stage 1 · Chapter 1' },
  { id: 'S2', title: 'Stage 2 · Chapter 2' },
  { id: 'S3', title: 'Stage 3 · Chapter 3 & Strangers' },
  { id: 'S4', title: 'Stage 4 · Chapter 4 & Heists' },
  { id: 'S5', title: 'Stage 5 · Chapter 5 & Economy' },
  { id: 'S6', title: 'Stage 6 · Post-Game Cleanup & Collectibles' },
];

export function isTrophyMasked(trophy, state) {
  if (!state.hideStorySpoilers) return false;
  if (trophy.kind !== 'story') return false;
  if (state.earned.includes(trophy.id)) return false;
  if (state.revealed.includes(trophy.id)) return false;
  return true;
}

export function getCounterValue(trophy, state) {
  if (state.earned.includes(trophy.id)) return trophy.target;
  return state.counters[trophy.id] || 0;
}

export function formatCounter(trophy, value) {
  if (trophy.unit === '$') {
    const kVal = Math.round(value / 1000);
    const kTgt = Math.round(trophy.target / 1000);
    return `$${kVal}k / $${kTgt}k`;
  }
  if (trophy.unit === '%') {
    return `${value}/${trophy.target}`;
  }
  return `${value}/${trophy.target}`;
}

export function computeFilterCounts(trophies, state) {
  const earnedSet = new Set(state.earned);
  return {
    all: trophies.length,
    story: trophies.filter((t) => t.kind === 'story').length,
    missable: trophies.filter((t) => t.missable === 'possible').length,
    unconfirmed: trophies.filter((t) => t.unconfirmed === true).length,
    collectibles: trophies.filter((t) => t.kind === 'collectibles').length,
    activities: trophies.filter((t) => t.kind === 'activities').length,
    side: trophies.filter((t) => t.kind === 'side').length,
    crime: trophies.filter((t) => t.kind === 'crime').length,
    misc: trophies.filter((t) => t.kind === 'misc').length,
    online: 0,
    todo: trophies.filter((t) => !earnedSet.has(t.id)).length,
  };
}

export function filterAndSortTrophies(trophies, state, ui) {
  const earnedSet = new Set(state.earned);
  const q = (ui.search || '').trim().toLowerCase();

  const filtered = trophies.filter((t) => {
    if (ui.stage !== 'all' && t.stage !== ui.stage) return false;
    if (ui.grade !== 'all' && t.grade !== ui.grade) return false;

    if (ui.category === 'story' && t.kind !== 'story') return false;
    if (ui.category === 'missable' && t.missable !== 'possible') return false;
    if (ui.category === 'unconfirmed' && !t.unconfirmed) return false;
    if (ui.category === 'collectibles' && t.kind !== 'collectibles') return false;
    if (ui.category === 'activities' && t.kind !== 'activities') return false;
    if (ui.category === 'side' && t.kind !== 'side') return false;
    if (ui.category === 'crime' && t.kind !== 'crime') return false;
    if (ui.category === 'misc' && t.kind !== 'misc') return false;
    if (ui.category === 'online') return false;
    if (ui.category === 'todo' && earnedSet.has(t.id)) return false;

    if (q) {
      const masked = isTrophyMasked(t, state);
      if (masked) {
        const hay = `story trophy hidden ${t.stage} ${t.grade}`.toLowerCase();
        return hay.includes(q);
      }
      const hay = `${t.name} ${t.description} ${t.guide} ${t.stage} ${t.kind}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });

  if (ui.sort === 'default') {
    return filtered.sort((a, b) => a.id - b.id);
  }
  if (ui.sort === 'grade') {
    return filtered.sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || a.id - b.id);
  }
  if (ui.sort === 'progress') {
    return filtered.sort((a, b) => {
      const pa = getCounterValue(a, state) / a.target;
      const pb = getCounterValue(b, state) / b.target;
      return pb - pa || a.id - b.id;
    });
  }

  // Default: 'roadmap' sort order
  const stageIdx = new Map(ROADMAP_GROUPS.map((g, i) => [g.id, i]));
  return filtered.sort((a, b) => {
    const sa = stageIdx.get(a.stage) ?? 99;
    const sb = stageIdx.get(b.stage) ?? 99;
    if (sa !== sb) return sa - sb;
    // Inside S1 put Gone Fishing -> Ch1 -> Cal -> Positive Mental Attitude cleanly
    if (a.stage === 'S1') {
      const order = { 2: 0, 3: 1, 20: 2, 28: 3 };
      return (order[a.id] ?? a.id) - (order[b.id] ?? b.id);
    }
    // Inside S2 put Trust (earned in demo) -> T**s Ass Drug Money (masked in demo) first
    if (a.stage === 'S2') {
      const order = { 8: 0, 4: 1, 33: 2, 34: 3, 36: 4, 41: 5 };
      return (order[a.id] ?? a.id) - (order[b.id] ?? b.id);
    }
    return a.id - b.id;
  });
}
