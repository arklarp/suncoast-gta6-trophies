export function suncoastMarkSvg() {
  return `<svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="#13202c"/>
    <circle cx="16" cy="14" r="6.5" fill="#d94c3a"/>
    <rect x="5" y="18.5" width="22" height="3" rx="1.5" fill="#14b8a6"/>
    <rect x="8" y="23.5" width="16" height="2.5" rx="1.25" fill="#f59e0b"/>
  </svg>`;
}

export function checkIconSvg() {
  return `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.2 8.4l3.1 3.1 6.5-6.8"/></svg>`;
}

export function lockIconSvg() {
  return `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>`;
}

export function gradeLabel(grade) {
  if (grade === 'platinum') return 'Platinum';
  if (grade === 'gold') return 'Gold';
  if (grade === 'silver') return 'Silver';
  return 'Bronze';
}

export function gradeShort(grade) {
  if (grade === 'platinum') return 'P';
  if (grade === 'gold') return 'G';
  if (grade === 'silver') return 'S';
  return 'B';
}
