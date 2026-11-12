import type {
  ResearchAnswer,
  ResearchGap,
  ResearchGapVM,
  ResearchQuestion,
  ResearchQuestionRules,
} from '#/types/creative-video';

export interface ResearchSelectionContext {
  fingerprint?: string;
  sessionId?: string;
}

const severityScore: Record<string, number> = {
  BLOCKING_CLAIM: 300,
  IMPORTANT: 200,
  OPTIONAL: 100,
};

const blockingScore: Record<string, number> = {
  BLOCK_APPROVAL: 30,
  WARN: 15,
  NONE: 0,
};

export function researchQuestionRules(
  question: ResearchQuestion,
): ResearchQuestionRules {
  return (
    question.rules ?? {
      applicableContextFingerprint: question.contextFingerprint,
      blockingPolicy: question.status === 'ANSWERED' ? 'NONE' : 'WARN',
      priority: 'NORMAL',
      sourceEvidenceIds: [],
    }
  );
}

/**
 * 纯函数读模型：不修改 Gap/Question/Answer，只回答“现在最该问什么”。
 * 规则对应 M1.1 文档：已答/矛盾/需重确认/跳过/DISMISSED/已解决/过期上下文。
 */
export function selectNextResearchGaps(
  gaps: ResearchGap[],
  questions: ResearchQuestion[],
  answers: ResearchAnswer[],
  context: ResearchSelectionContext = {},
  limit = 3,
): ResearchGapVM[] {
  const result: ResearchGapVM[] = [];
  for (const gap of gaps) {
    if (gap.state === 'RESOLVED') continue;
    const gapQuestions = questions.filter(
      (question) =>
        question.gapId === gap.id &&
        (!context.sessionId || question.sessionId === context.sessionId),
    );
    const latestQuestion = gapQuestions.toSorted((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )[0];
    const answer = latestQuestion
      ? answers.find((item) => item.id === latestQuestion.answerId)
      : undefined;
    const contextChanged =
      Boolean(context.fingerprint) &&
      Boolean(latestQuestion?.contextFingerprint) &&
      latestQuestion?.contextFingerprint !== context.fingerprint;
    const needsReconfirmation =
      contextChanged ||
      answer?.validity === 'CONTRADICTED' ||
      answer?.validity === 'REVOKED' ||
      answer?.validity === 'STALE' ||
      gap.state === 'STALE';
    const sameContextSuppressed =
      !contextChanged &&
      latestQuestion &&
      ['ANSWERED', 'DISMISSED', 'SKIPPED'].includes(latestQuestion.status) &&
      !needsReconfirmation;
    if (sameContextSuppressed) continue;

    const rules = latestQuestion ? researchQuestionRules(latestQuestion) : null;
    result.push({
      id: gap.id,
      needsReconfirmation,
      priorityScore:
        (severityScore[gap.severity] ?? 0) +
        (needsReconfirmation ? 20 : 0) +
        (rules ? (blockingScore[rules.blockingPolicy] ?? 0) : 0),
      relevantEvidenceFingerprint: context.fingerprint,
      severity: gap.severity,
      status: gap.state,
    });
  }
  return result
    .toSorted((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, Math.max(0, limit));
}
