import { describe, expect, it } from 'vitest';
import { createExperienceNavigation } from './experience-navigation';

const origin = 'https://opentu.example';
const url = (path: string) => new URL(path, origin);
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
};

describe('experience return navigation', () => {
  it('opens home on first switch, then restores the exact canvas through repeated switches and a reload', () => {
    const saved = storage();
    let switchTo = createExperienceNavigation(saved);
    expect(switchTo(url('/?board=a&experience=legacy'), 'new', 'legacy').pathname).toBe('/');
    const canvas = url('/workflow/canvas/project-two?board=a&experience=new&view=canvas');
    let legacy = switchTo(canvas, 'legacy', 'new');
    expect(legacy.pathname).toBe('/');
    expect(legacy.searchParams.has('view')).toBe(false);
    switchTo = createExperienceNavigation(saved);
    for (let i = 0; i < 3; i++) {
      const restored = switchTo(legacy, 'new', 'legacy');
      expect(restored.pathname).toBe('/workflow/canvas/project-two');
      expect(restored.searchParams.get('board')).toBe('a');
      expect(restored.searchParams.get('view')).toBe('canvas');
      legacy = switchTo(restored, 'legacy', 'new');
    }
  });

  it('preserves an intentional return home and does not mix boards', () => {
    const switchTo = createExperienceNavigation(storage());
    switchTo(url('/workflow/canvas/p?board=a'), 'legacy', 'new');
    expect(switchTo(url('/?board=b'), 'new', 'legacy').pathname).toBe('/');
    switchTo(url('/?board=a&experience=new'), 'legacy', 'new');
    const restored = switchTo(url('/?board=a'), 'new', 'legacy');
    expect(restored.pathname).toBe('/');
    expect(restored.searchParams.has('view')).toBe(false);
  });

  it('keeps navigation working when storage is blocked and ignores invalid stored destinations', () => {
    const switchTo = createExperienceNavigation({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
    const legacy = switchTo(url('/workflow/canvas/p?board=a'), 'legacy', 'new');
    expect(switchTo(legacy, 'new', 'legacy').pathname).toBe('/workflow/canvas/p');
    const invalid = createExperienceNavigation({ getItem: () => '//evil.example/path', setItem() {} });
    expect(invalid(url('/?board=a'), 'new', 'legacy').href).toBe(`${origin}/?board=a&experience=new`);
  });

  it('preserves view=canvas before project routing and leaves same-version clicks in place', () => {
    const switchTo = createExperienceNavigation(null);
    const current = url('/?board=a&experience=new&view=canvas');
    expect(switchTo(current, 'new', 'new').href).toBe(current.href);
    expect(switchTo(switchTo(current, 'legacy', 'new'), 'new', 'legacy').searchParams.get('view')).toBe('canvas');
  });
});
