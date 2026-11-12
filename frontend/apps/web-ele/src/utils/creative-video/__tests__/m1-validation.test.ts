import type { ProjectFormValues } from '../validation';

import type { VideoProject } from '#/types/creative-video';

import { describe, expect, it } from 'vitest';

import {
  MARKET_OPTIONS,
  OBJECTIVE_OPTIONS,
  PLATFORM_OPTIONS,
  stageReviewState,
} from '../project-stage';
import {
  createIdempotencyKey,
  formatFileSize,
  validateProductUrl,
  validateProjectForm,
} from '../validation';

describe('validateProductUrl', () => {
  it('accepts http(s) urls', () => {
    expect(validateProductUrl('https://example.com/product')).toBe('');
    expect(validateProductUrl('http://example.com')).toBe('');
    expect(validateProductUrl('')).toBe('');
  });

  it('rejects unsafe protocols and local hosts', () => {
    expect(validateProductUrl('javascript:alert(1)')).not.toBe('');
    expect(validateProductUrl('file:///etc/passwd')).not.toBe('');
    expect(validateProductUrl('http://localhost:3000')).not.toBe('');
    expect(validateProductUrl('http://127.0.0.1')).not.toBe('');
    expect(validateProductUrl('not-a-url')).not.toBe('');
  });
});

describe('validateProjectForm', () => {
  const base = {
    aspectRatio: '9:16',
    description: '',
    durationSec: 30,
    language: 'zh-CN',
    market: 'CN',
    marketingObjective: 'signup',
    negativeGuidance: '',
    platforms: ['douyin'],
    productName: '',
    productUrl: '',
    rightsConfirmed: true,
    stylePreferences: [],
    targetAudience: '',
    title: '测试项目',
  } satisfies ProjectFormValues;

  it('accepts a minimal valid form', () => {
    expect(validateProjectForm(base)).toEqual({});
  });

  it('requires title, platforms, duration and rights confirmation', () => {
    const errors = validateProjectForm({
      ...base,
      durationSec: 31,
      platforms: [],
      rightsConfirmed: false,
      title: '  ',
    });
    expect(errors.title).toBeTruthy();
    expect(errors.platforms).toBeTruthy();
    expect(errors.durationSec).toBeTruthy();
    expect(errors.rightsConfirmed).toBeTruthy();
  });

  it('rejects overlong text fields', () => {
    const errors = validateProjectForm({
      ...base,
      description: 'a'.repeat(2001),
      negativeGuidance: 'b'.repeat(1001),
      targetAudience: 'c'.repeat(1001),
      title: 'a'.repeat(101),
    });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining([
        'description',
        'negativeGuidance',
        'targetAudience',
        'title',
      ]),
    );
  });
});

describe('project stage helpers', () => {
  const project = (currentStage: string, status: string) =>
    ({ currentStage, status }) as unknown as VideoProject;

  it('derives review state from stage and status', () => {
    expect(stageReviewState(project('INGEST', 'DRAFT'))).toBe('IN_PROGRESS');
    expect(stageReviewState(project('UNDERSTANDING', 'WAITING_REVIEW'))).toBe(
      'WAITING_REVIEW',
    );
    expect(stageReviewState(project('ANGLES', 'IN_PROGRESS'))).toBe(
      'CONFIRMED',
    );
  });

  it('provides M1 platform / objective / market options', () => {
    expect(PLATFORM_OPTIONS.map((item) => item.value)).toEqual(
      expect.arrayContaining(['douyin', 'website', 'sales']),
    );
    expect(OBJECTIVE_OPTIONS).toHaveLength(5);
    expect(MARKET_OPTIONS).toHaveLength(3);
  });
});

describe('idempotency + file helpers', () => {
  it('generates unique request keys', () => {
    const a = createIdempotencyKey('project');
    const b = createIdempotencyKey('project');
    expect(a).not.toBe(b);
    expect(a.startsWith('project-')).toBe(true);
  });

  it('formats file sizes', () => {
    expect(formatFileSize(10)).toBe('10 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
