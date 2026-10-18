import { describe, expect, it } from 'vitest';
import { selectHomeRelease } from './release-highlights';

describe('home release highlights', () => {
  const release = {
    version: '1.2.0',
    date: '2026-10-17',
    changes: {
      features: [' 新增画布 ', '新增画布'],
      fixes: ['修复项目恢复'],
      improvements: [' ', '优化切换'],
    },
  };

  it('selects only the running version and groups its real changes', () => {
    const result = selectHomeRelease({ versions: [
      { ...release, version: '1.3.0', changes: { features: ['未来功能'] } },
      release,
      { ...release, version: '1.1.0' },
    ] }, '1.2.0');
    expect(result).toEqual({
      version: '1.2.0', date: release.date,
      groups: [
        { title: '新增功能', items: ['新增画布'] },
        { title: '问题修复', items: ['修复项目恢复'] },
        { title: '体验优化', items: ['优化切换'] },
      ],
    });
    expect(release.changes.features).toEqual([' 新增画布 ', '新增画布']);
  });

  it('retains fixes and improvements in releases without new features', () => {
    expect(selectHomeRelease({ versions: [{ ...release, changes: { fixes: ['恢复旧项目'] } }] }, '1.2.0')?.groups)
      .toEqual([{ title: '问题修复', items: ['恢复旧项目'] }]);
  });

  it.each(['1.3.0', 'Unreleased', '1.2.0-beta.1', ''])('does not substitute old notes for %s', (version) => {
    expect(selectHomeRelease({ versions: [release] }, version)).toBeNull();
  });

  it('excludes withdrawn versions even when their version matches', () => {
    expect(selectHomeRelease({ versions: [{ ...release, status: 'withdrawn' }] }, '1.2.0')).toBeNull();
  });

  it('falls back when logs or meaningful entries are missing', () => {
    expect(selectHomeRelease({}, '1.2.0')).toBeNull();
    expect(selectHomeRelease({ versions: [{ ...release, changes: undefined }] }, '1.2.0')).toBeNull();
    expect(selectHomeRelease({ versions: [{ ...release, changes: { features: [' '] } }] }, '1.2.0')).toBeNull();
  });
});
