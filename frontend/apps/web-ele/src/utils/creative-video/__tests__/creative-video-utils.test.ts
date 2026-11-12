import { describe, expect, it } from 'vitest';

import { formatDateTime, formatDuration, truncateText } from '../format';
import {
  getStageByKey,
  getStageBySlug,
  getStudioPath,
  STUDIO_STAGES,
} from '../stages';

describe('studio stages', () => {
  it('keeps the eight M0 stages in product order', () => {
    expect(STUDIO_STAGES).toHaveLength(8);
    expect(STUDIO_STAGES.map((stage) => stage.key)).toEqual([
      'INGEST',
      'UNDERSTANDING',
      'ANGLES',
      'SCRIPT',
      'STORYBOARD',
      'ANIMATIC',
      'GENERATE',
      'RENDER',
    ]);
  });

  it('resolves stages by key and by url slug', () => {
    expect(getStageByKey('STORYBOARD')?.slug).toBe('storyboard');
    expect(getStageBySlug('render')?.key).toBe('RENDER');
    expect(getStageBySlug('unknown')).toBeUndefined();
  });

  it('builds an encoded studio deep link', () => {
    expect(getStudioPath('project_resume_3d')).toBe(
      '/studio/project_resume_3d/ingest',
    );
    expect(getStudioPath('project_resume_3d', 'ANGLES')).toBe(
      '/studio/project_resume_3d/angles',
    );
  });
});

describe('format helpers', () => {
  it('formats durations for display', () => {
    expect(formatDuration(30)).toBe('30 秒');
    expect(formatDuration(60)).toBe('1 分');
    expect(formatDuration(120)).toBe('2 分');
    expect(formatDuration(90)).toBe('1 分 30 秒');
    expect(formatDuration(-1)).toBe('—');
  });

  it('formats ISO timestamps with a stable shape', () => {
    expect(formatDateTime('2026-11-06T04:00:00.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
  });

  it('truncates long text', () => {
    expect(truncateText('VidCraft', 10)).toBe('VidCraft');
    expect(truncateText('产品网址到营销视频', 4)).toBe('产品网址…');
  });
});
