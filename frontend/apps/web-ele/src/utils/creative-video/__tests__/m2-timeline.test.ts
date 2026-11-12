import { describe, expect, it } from 'vitest';

import {
  buildTimeline,
  findCurrentShot,
  formatMs,
  formatMsPrecise,
  segmentAtShot,
} from '../m2-timeline';

describe('buildTimeline', () => {
  const shots = [
    { durationMs: 6000, id: 'r1', shotId: 's1' },
    { durationMs: 4000, id: 'r2', shotId: 's2' },
    { durationMs: 10_000, id: 'r3', shotId: 's3' },
  ];

  it('builds zero-overlap segments and total duration', () => {
    const { segments, totalDurationMs } = buildTimeline(shots);
    expect(totalDurationMs).toBe(20_000);
    expect(segments.map((segment) => [segment.startMs, segment.endMs])).toEqual(
      [
        [0, 6000],
        [6000, 10_000],
        [10_000, 20_000],
      ],
    );
  });

  it('subtracts overlap transitions from net duration', () => {
    const { segments, totalDurationMs } = buildTimeline([
      { durationMs: 6000, id: 'r1', overlapToNextMs: 500, shotId: 's1' },
      { durationMs: 4000, id: 'r2', overlapToNextMs: 500, shotId: 's2' },
      { durationMs: 10_000, id: 'r3', shotId: 's3' },
    ]);
    expect(totalDurationMs).toBe(19_000);
    expect(segments[1]?.startMs).toBe(5500);
    expect(segments[1]?.overlapWithNextMs).toBe(500);
  });

  it('rejects invalid durations and overlaps', () => {
    expect(() =>
      buildTimeline([{ durationMs: 0, id: 'r', shotId: 's' }]),
    ).toThrow('INVALID_DURATION');
    expect(() =>
      buildTimeline([
        { durationMs: 1000, id: 'r1', overlapToNextMs: 1200, shotId: 's1' },
        { durationMs: 1000, id: 'r2', shotId: 's2' },
      ]),
    ).toThrow('INVALID_OVERLAP');
    expect(() =>
      buildTimeline([
        { durationMs: 1000, id: 'r1', overlapToNextMs: -100, shotId: 's1' },
        { durationMs: 1000, id: 'r2', shotId: 's2' },
      ]),
    ).toThrow('INVALID_OVERLAP');
  });

  it('returns empty timeline for no shots', () => {
    expect(buildTimeline([])).toEqual({ segments: [], totalDurationMs: 0 });
  });
});

describe('findCurrentShot', () => {
  const { segments } = buildTimeline([
    { durationMs: 6000, id: 'r1', shotId: 's1' },
    { durationMs: 4000, id: 'r2', shotId: 's2' },
  ]);

  it('uses left-closed/right-open intervals', () => {
    expect(findCurrentShot(segments, 0)?.shotId).toBe('s1');
    expect(findCurrentShot(segments, 5999)?.shotId).toBe('s1');
    expect(findCurrentShot(segments, 6000)?.shotId).toBe('s2');
    expect(findCurrentShot(segments, 10_000)?.shotId).toBe('s2');
    expect(findCurrentShot(segments, 10_001)).toBeNull();
  });

  it('finds a segment by shot id', () => {
    expect(segmentAtShot(segments, 's2')?.startMs).toBe(6000);
    expect(segmentAtShot(segments, 's3')).toBeNull();
  });
});

describe('format helpers', () => {
  it('formats mm:ss and mm:ss.t', () => {
    expect(formatMs(0)).toBe('00:00');
    expect(formatMs(65_000)).toBe('01:05');
    expect(formatMsPrecise(65_000)).toBe('01:05.0');
    expect(formatMsPrecise(120_400)).toBe('02:00.4');
  });
});
