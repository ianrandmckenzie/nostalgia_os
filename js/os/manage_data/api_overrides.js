import { apiOverrides } from './state.js';
import { saveState } from './persistence.js';

// Helper functions for API overrides
export function markSlugAsDeleted(slug) {
  if (!slug) return;
  if (!apiOverrides.deletedSlugs.includes(slug)) {
    apiOverrides.deletedSlugs.push(slug);
    saveState();
  }
}

export function unmarkSlugAsDeleted(slug) {
  if (!slug) return;
  const index = apiOverrides.deletedSlugs.indexOf(slug);
  if (index > -1) {
    apiOverrides.deletedSlugs.splice(index, 1);
    saveState();
  }
}

export function markSlugAsMoved(slug, newFullPath) {
  if (!slug || !newFullPath) return;
  console.log(`📝 Marking slug as moved: ${slug} -> ${newFullPath}`);
  apiOverrides.movedSlugs[slug] = newFullPath;
  saveState();
}

if (typeof window !== 'undefined') {
  window.markSlugAsDeleted = markSlugAsDeleted;
  window.unmarkSlugAsDeleted = unmarkSlugAsDeleted;
  window.markSlugAsMoved = markSlugAsMoved;
}
