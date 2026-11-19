export const STORAGE_KEY = 'suncoast_gtavi_ps5_v1';

export function createEmptyState() {
  return {
    version: 1,
    earned: [],
    counters: {},
    revealed: [],
    hideStorySpoilers: true,
    updatedAt: null,
  };
}

export function createShotDemoState() {
  return {
    version: 1,
    earned: [2, 3, 8, 20, 21, 22, 23, 24, 29, 33, 34, 36, 37, 39, 41, 46, 47],
    counters: {
      14: 23,
      15: 48,
      16: 6,
      17: 14,
      18: 5,
      25: 3,
      28: 9,
      31: 31,
      42: 29,
    },
    revealed: [],
    hideStorySpoilers: true,
    updatedAt: '2026-11-19T14:30:00Z',
  };
}

export function sanitizeState(raw, trophies) {
  const validIds = new Set(trophies.map((t) => t.id));
  const byId = new Map(trophies.map((t) => [t.id, t]));
  const base = createEmptyState();
  if (!raw || typeof raw !== 'object') return base;

  const earnedSet = new Set();
  if (Array.isArray(raw.earned)) {
    for (const id of raw.earned) {
      const n = Number(id);
      if (validIds.has(n)) earnedSet.add(n);
    }
  }

  const counters = {};
  if (raw.counters && typeof raw.counters === 'object') {
    for (const [k, v] of Object.entries(raw.counters)) {
      const id = Number(k);
      const t = byId.get(id);
      if (!t || t.target <= 1) continue;
      const num = Math.max(0, Math.min(t.target, Math.floor(Number(v) || 0)));
      if (num > 0) counters[id] = num;
    }
  }

  const revealedSet = new Set();
  if (Array.isArray(raw.revealed)) {
    for (const id of raw.revealed) {
      const n = Number(id);
      if (validIds.has(n)) revealedSet.add(n);
    }
  }

  return {
    version: 1,
    earned: Array.from(earnedSet).sort((a, b) => a - b),
    counters,
    revealed: Array.from(revealedSet).sort((a, b) => a - b),
    hideStorySpoilers: raw.hideStorySpoilers !== false,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

export function loadProgress(trophies) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    return sanitizeState(JSON.parse(raw), trophies);
  } catch {
    return createEmptyState();
  }
}

export function saveProgress(state) {
  const payload = {
    ...state,
    updatedAt: state.updatedAt || new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function serializeBackup(state) {
  const earnedLine = JSON.stringify(state.earned);
  const pairs = Object.entries(state.counters).map(([k, v]) => `"${k}": ${v}`);
  let countersBlock = '{}';
  if (pairs.length > 0) {
    const rows = [];
    for (let i = 0; i < pairs.length; i += 5) {
      rows.push('    ' + pairs.slice(i, i + 5).join(', '));
    }
    countersBlock = `{\n${rows.join(',\n')}\n  }`;
  }
  const revealedLine = JSON.stringify(state.revealed);
  return [
    '{',
    '  "app": "SUNCOAST",',
    '  "game": "Grand Theft Auto VI (PS5)",',
    '  "version": 1,',
    `  "hideStorySpoilers": ${state.hideStorySpoilers},`,
    `  "earned": ${earnedLine},`,
    `  "counters": ${countersBlock},`,
    `  "revealed": ${revealedLine}`,
    '}',
  ].join('\n');
}

export function parseBackupJson(text, trophies) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.earned)) {
    throw new Error('Invalid SUNCOAST backup JSON: expected an "earned" array.');
  }
  return sanitizeState(parsed, trophies);
}
