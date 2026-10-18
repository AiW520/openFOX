type ReleaseChanges = Partial<Record<'features' | 'fixes' | 'improvements', string[]>>;

type AppChangelog = {
  versions?: Array<{
    version: string;
    date: string;
    status?: string;
    changes?: ReleaseChanges;
  }>;
};

export type HomeReleaseHighlights = {
  version: string;
  date: string;
  groups: Array<{ title: string; items: string[] }>;
};

export function selectHomeRelease(
  changelog: AppChangelog,
  appVersion: string
): HomeReleaseHighlights | null {
  if (!/^\d+\.\d+\.\d+$/.test(appVersion)) return null;
  const release = changelog.versions?.find((item) => item.version === appVersion);
  if (!release || release.status === 'withdrawn') return null;

  const categories = [
    ['features', '新增功能'],
    ['fixes', '问题修复'],
    ['improvements', '体验优化'],
  ] as const;
  const groups = categories
    .map(([key, title]) => ({
      title,
      items: [...new Set(release.changes?.[key]?.map((item) => item.trim()).filter(Boolean))],
    }))
    .filter((group) => group.items.length > 0);

  return groups.length ? { version: release.version, date: release.date, groups } : null;
}
