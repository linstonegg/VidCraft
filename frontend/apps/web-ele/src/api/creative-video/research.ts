import type {
  ResearchAnswer,
  ResearchGap,
  ResearchQuestion,
  ResearchSession,
  ResearchSessionView,
} from '#/types/creative-video';

import { getBusinessData, postBusinessData } from './client';

export interface ResearchGapsResult {
  context: {
    ingestionSnapshotId?: string;
    ingestionStateVersion: number;
    sourceSetFingerprint?: string;
  };
  gaps: ResearchGap[];
  projectId: string;
}

export function getResearchGaps(projectId: string) {
  return getBusinessData<ResearchGapsResult>(
    `/projects/${encodeURIComponent(projectId)}/research/gaps`,
  );
}

export function evaluateResearchGaps(projectId: string) {
  return postBusinessData<{ evaluated: boolean }>(
    `/projects/${encodeURIComponent(projectId)}/research/gaps/evaluate`,
    {},
  );
}

export function createResearchSession(
  projectId: string,
  payload: { basedOnIngestionVersion: number },
) {
  return postBusinessData<ResearchSession>(
    `/projects/${encodeURIComponent(projectId)}/research/sessions`,
    payload,
  );
}

export function getResearchSession(projectId: string, sessionId: string) {
  return getBusinessData<ResearchSessionView>(
    `/projects/${encodeURIComponent(projectId)}/research/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export function nextResearchQuestions(
  projectId: string,
  sessionId: string,
  payload: { expectedVersion: number; maxCount?: number },
) {
  return postBusinessData<ResearchSessionView>(
    `/projects/${encodeURIComponent(projectId)}/research/sessions/${encodeURIComponent(sessionId)}/questions/next`,
    payload,
  );
}

export function answerResearchQuestion(
  projectId: string,
  questionId: string,
  payload: { answer: string; expectedVersion: number },
) {
  return postBusinessData<ResearchAnswer>(
    `/projects/${encodeURIComponent(projectId)}/research/questions/${encodeURIComponent(questionId)}/answers`,
    payload,
  );
}

export function skipResearchQuestion(
  projectId: string,
  questionId: string,
  payload: { expectedVersion: number },
) {
  return postBusinessData(
    `/projects/${encodeURIComponent(projectId)}/research/questions/${encodeURIComponent(questionId)}/skip`,
    payload,
  );
}

export function getResearchHistory(projectId: string) {
  return getBusinessData<{
    answers: ResearchAnswer[];
    sources: Array<{ id: string; summary?: string; title: string }>;
  }>(`/projects/${encodeURIComponent(projectId)}/research/history`);
}
export function dismissResearchQuestion(
  projectId: string,
  questionId: string,
  payload: { expectedVersion: number; reason: string },
) {
  return postBusinessData(
    `/projects/${encodeURIComponent(projectId)}/research/questions/${encodeURIComponent(questionId)}/dismiss`,
    payload,
  );
}
export function confirmResearchFact(
  projectId: string,
  answerId: string,
  payload: { title?: string } = {},
) {
  return postBusinessData<{
    answerId: string;
    proposedFeature: {
      description: string;
      evidenceLevel: string;
      title: string;
    };
    status: string;
  }>(
    `/projects/${encodeURIComponent(projectId)}/research/answers/${encodeURIComponent(answerId)}/confirm-fact`,
    payload,
  );
}
export interface ResearchQuestionsResult {
  answers: ResearchAnswer[];
  context: { sourceSetFingerprint?: string };
  questions: ResearchQuestion[];
}

export function getResearchQuestions(projectId: string) {
  return getBusinessData<ResearchQuestionsResult>(
    `/projects/${encodeURIComponent(projectId)}/research/questions`,
  );
}
export function revokeResearchAnswer(projectId: string, answerId: string) {
  return postBusinessData<ResearchAnswer>(
    `/projects/${encodeURIComponent(projectId)}/research/answers/${encodeURIComponent(answerId)}/revoke`,
    {},
  );
}
