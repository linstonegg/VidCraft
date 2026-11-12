import type { TimelineSegment } from '#/types/creative-video';

export interface TimelineShotInput {
  durationMs: number;
  id: string;
  overlapToNextMs?: number;
  referenceImageId?: string;
  shotId: string;
}

export function formatMs(ms: number) {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatMsPrecise(ms: number) {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function buildTimeline(shots: TimelineShotInput[]) {
  let cursor = 0;
  const segments: TimelineSegment[] = [];
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    if (!shot) {
      throw new Error('INVALID_DURATION');
    }
    if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0) {
      throw new Error('INVALID_DURATION');
    }
    const overlap = index < shots.length - 1 ? (shot.overlapToNextMs ?? 0) : 0;
    if (overlap < 0 || overlap > shot.durationMs) {
      throw new Error('INVALID_OVERLAP');
    }
    segments.push({
      durationMs: shot.durationMs,
      endMs: cursor + shot.durationMs,
      overlapWithNextMs: overlap,
      referenceImageId: shot.referenceImageId,
      shotId: shot.shotId,
      shotRevisionId: shot.id,
      startMs: cursor,
    });
    cursor += shot.durationMs - overlap;
  }
  return { segments, totalDurationMs: cursor };
}

export function findCurrentShot(segments: TimelineSegment[], timeMs: number) {
  return (
    segments.find(
      (segment, index) =>
        timeMs >= segment.startMs &&
        (timeMs < segment.endMs ||
          (index === segments.length - 1 && timeMs === segment.endMs)),
    ) ?? null
  );
}

export function segmentAtShot(segments: TimelineSegment[], shotId: string) {
  return segments.find((segment) => segment.shotId === shotId) ?? null;
}
