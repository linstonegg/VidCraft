import type {
  ResearchAnswer,
  ResearchGap,
  ResearchQuestion,
} from '#/types/creative-video';

import { describe, expect, it } from 'vitest';

import { selectNextResearchGaps } from '../research';

const now = '2026-11-09T00:00:00.000Z';

function gap(id: string, overrides: Partial<ResearchGap> = {}): ResearchGap {
  return {
    code: id,
    createdAt: now,
    id,
    projectId: 'p1',
    severity: 'IMPORTANT',
    state: 'OPEN',
    title: id,
    updatedAt: now,
    version: 1,
    whyItMatters: 'why',
    ...overrides,
  };
}

function question(
  id: string,
  gapId: string,
  overrides: Partial<ResearchQuestion> = {},
): ResearchQuestion {
  return {
    contextFingerprint: 'fp-1',
    createdAt: now,
    gapId,
    id,
    projectId: 'p1',
    question: 'q',
    sessionId: 's1',
    status: 'ASKED',
    updatedAt: now,
    version: 1,
    ...overrides,
  };
}

function answer(
  id: string,
  questionId: string,
  validity: ResearchAnswer['validity'],
): ResearchAnswer {
  return {
    answer: 'a',
    createdAt: now,
    id,
    projectId: 'p1',
    questionId,
    updatedAt: now,
    validity,
    version: 1,
  };
}

describe('selectNextResearchGaps', () => {
  it('同上下文已答且有效的问题不再追问', () => {
    const q = question('q1', 'g1', {
      answerId: 'a1',
      status: 'ANSWERED',
    });
    const result = selectNextResearchGaps(
      [gap('g1')],
      [q],
      [answer('a1', 'q1', 'VALID')],
      { fingerprint: 'fp-1', sessionId: 's1' },
    );
    expect(result).toHaveLength(0);
  });

  it('答案矛盾时重新进入待确认', () => {
    const q = question('q1', 'g1', {
      answerId: 'a1',
      status: 'ANSWERED',
    });
    const result = selectNextResearchGaps(
      [gap('g1')],
      [q],
      [answer('a1', 'q1', 'CONTRADICTED')],
      { fingerprint: 'fp-1', sessionId: 's1' },
    );
    expect(result[0]?.needsReconfirmation).toBe(true);
    expect(result[0]?.priorityScore).toBeGreaterThan(200);
  });

  it('同上下文跳过或 DISMISSED 不追问', () => {
    const result = selectNextResearchGaps(
      [gap('g1'), gap('g2')],
      [
        question('q1', 'g1', { status: 'SKIPPED' }),
        question('q2', 'g2', {
          dismissedReason: 'not applicable',
          status: 'DISMISSED',
        }),
      ],
      [],
      { fingerprint: 'fp-1', sessionId: 's1' },
    );
    expect(result).toHaveLength(0);
  });

  it('资料上下文变化后允许重新评估跳过问题', () => {
    const result = selectNextResearchGaps(
      [gap('g1')],
      [question('q1', 'g1', { status: 'SKIPPED' })],
      [],
      { fingerprint: 'fp-2', sessionId: 's1' },
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.needsReconfirmation).toBe(true);
  });

  it('resolved gap 被排除', () => {
    const result = selectNextResearchGaps(
      [gap('g1', { state: 'RESOLVED' })],
      [],
      [],
      { fingerprint: 'fp-1', sessionId: 's1' },
    );
    expect(result).toHaveLength(0);
  });

  it('stale gap 优先于普通 Gap', () => {
    const result = selectNextResearchGaps(
      [gap('g1'), gap('g2', { state: 'STALE' })],
      [],
      [],
      { fingerprint: 'fp-1', sessionId: 's1' },
    );
    expect(result[0]?.id).toBe('g2');
  });

  it('blocking_claim 优先，且限制返回数量', () => {
    const result = selectNextResearchGaps(
      [
        gap('g1', { severity: 'OPTIONAL' }),
        gap('g2', { severity: 'BLOCKING_CLAIM' }),
        gap('g3', { severity: 'IMPORTANT' }),
      ],
      [],
      [],
      { fingerprint: 'fp-1', sessionId: 's1' },
      2,
    );
    expect(result.map((item) => item.id)).toEqual(['g2', 'g3']);
  });
});
