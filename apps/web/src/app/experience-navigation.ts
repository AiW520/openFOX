import type { ExperienceVersion } from './experience-version';

const LOCATION_KEY_PREFIX = 'opentu_new_location_v1:';
type LocationStorage = Pick<Storage, 'getItem' | 'setItem'>;

function validLocation(value: string | null): value is string {
  return value === '/' || value === '/?view=canvas' ||
    (value !== null && /^\/workflow\/canvas\/[^/?#]+$/.test(value));
}

// Session storage keeps each tab's return location separate from other tabs.
export function createExperienceNavigation(storage?: LocationStorage | null) {
  const locations = new Map<string, string>();
  const availableStorage = () => storage === undefined ? window.sessionStorage : storage;

  return (current: URL, target: ExperienceVersion, active: ExperienceVersion): URL => {
    const url = new URL(current);
    if (target === active) return url;
    const key = LOCATION_KEY_PREFIX + (current.searchParams.get('board') || 'default');
    if (active === 'new') {
      const location = /^\/workflow\/canvas\/[^/?#]+$/.test(current.pathname)
        ? current.pathname
        : current.pathname.startsWith('/workflow') || current.searchParams.get('view') === 'canvas'
          ? '/?view=canvas'
          : '/';
      locations.set(key, location);
      try { availableStorage()?.setItem(key, location); } catch { /* Use the in-memory location. */ }
    }

    let location = '/';
    if (target === 'new') {
      let saved = locations.get(key) || null;
      try { saved ||= availableStorage()?.getItem(key) || null; } catch { /* Storage may be blocked. */ }
      if (validLocation(saved)) location = saved;
    }
    const destination = new URL(location, current.origin);
    url.pathname = destination.pathname;
    url.searchParams.set('experience', target);
    if (destination.pathname.startsWith('/workflow') || destination.searchParams.get('view') === 'canvas') {
      url.searchParams.set('view', 'canvas');
    } else {
      url.searchParams.delete('view');
    }
    return url;
  };
}
