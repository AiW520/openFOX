export type ExperienceVersion = 'legacy' | 'new';

export const EXPERIENCE_VERSION_STORAGE_KEY = 'opentu_experience_version_v1';

export function parseExperienceVersion(value: unknown): ExperienceVersion {
  return value === 'new' || value === 'legacy' ? value : 'legacy';
}

export function readExperienceVersion(
  storage?: Pick<Storage, 'getItem'> | null,
  fallback: ExperienceVersion = 'legacy'
): ExperienceVersion {
  try {
    const availableStorage =
      storage === undefined
        ? typeof window === 'undefined'
          ? null
          : window.localStorage
        : storage;
    const stored = availableStorage?.getItem(EXPERIENCE_VERSION_STORAGE_KEY);
    return stored === 'new' || stored === 'legacy' ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function writeExperienceVersion(
  version: ExperienceVersion,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  try {
    const availableStorage =
      storage === undefined
        ? typeof window === 'undefined'
          ? null
          : window.localStorage
        : storage;
    availableStorage?.setItem(EXPERIENCE_VERSION_STORAGE_KEY, version);
  } catch {
    // The current session can still switch even when storage is unavailable.
  }
}
