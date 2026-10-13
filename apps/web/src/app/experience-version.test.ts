import { describe, expect, it, vi } from 'vitest';
import {
  EXPERIENCE_VERSION_STORAGE_KEY,
  parseExperienceVersion,
  readExperienceVersion,
  writeExperienceVersion,
} from './experience-version';

describe('experience version preference', () => {
  it('defaults mobile to new while preserving an explicit legacy preference', () => {
    expect(readExperienceVersion({ getItem: () => null }, 'new')).toBe('new');
    expect(readExperienceVersion({ getItem: () => 'legacy' }, 'new')).toBe('legacy');
  });
  it('defaults invalid and missing values to the legacy experience', () => {
    expect(parseExperienceVersion(null)).toBe('legacy');
    expect(parseExperienceVersion('future')).toBe('legacy');
    expect(readExperienceVersion({ getItem: () => null })).toBe('legacy');
  });

  it('restores and persists an explicit new experience choice', () => {
    expect(readExperienceVersion({ getItem: () => 'new' })).toBe('new');

    const setItem = vi.fn();
    writeExperienceVersion('new', { setItem });
    expect(setItem).toHaveBeenCalledWith(EXPERIENCE_VERSION_STORAGE_KEY, 'new');
  });

  it('falls back safely when storage is unavailable', () => {
    expect(
      readExperienceVersion({
        getItem: () => {
          throw new Error('blocked');
        },
      })
    ).toBe('legacy');

    expect(() =>
      writeExperienceVersion('new', {
        setItem: () => {
          throw new Error('blocked');
        },
      })
    ).not.toThrow();
  });

  it('handles an embedding host denying access to the storage property itself', () => {
    const blockedStorage = vi
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new DOMException('Blocked by host', 'SecurityError');
      });
    try {
      expect(readExperienceVersion()).toBe('legacy');
      expect(() => writeExperienceVersion('new')).not.toThrow();
    } finally {
      blockedStorage.mockRestore();
    }
  });
});
