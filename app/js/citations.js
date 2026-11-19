export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formats prose with inline [1][2] citations cleanly:
 * - Zero space before punctuation
 * - Wraps the preceding word + [n] refs + trailing punctuation in a non-breaking span
 *   so a period or comma never orphans onto a new line.
 */
export function renderCitedText(raw) {
  const safe = escapeHtml(raw);
  return safe.replace(
    /(\S+?)((?:\[\d+\])+)([.,;:!?]?)/g,
    (_, word, refs, punct) => {
      const supHtml = refs.replace(/\[(\d+)\]/g, '<sup class="cite-ref">[$1]</sup>');
      return `<span class="cite-keep">${word}${supHtml}${punct}</span>`;
    },
  );
}

export function renderSourceCards(sourceRefs, catalog) {
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) return '';
  return `<div class="sources-grid">${sourceRefs
    .map((ref, idx) => {
      const meta = catalog[ref.key] || { title: ref.key, site: '', url: '#' };
      const num = idx + 1;
      return `<article class="source-card">
        <div class="source-title-row">
          <span class="source-num">[${num}]</span>
          <a class="source-link" href="${escapeHtml(meta.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(meta.title)}</a>
        </div>
        <div class="source-backs"><strong>Backs:</strong> ${escapeHtml(ref.backs)}</div>
      </article>`;
    })
    .join('')}</div>`;
}
