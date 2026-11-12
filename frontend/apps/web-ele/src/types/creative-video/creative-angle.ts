import type { EvidenceLevel, ID, ISODateTime, VersionedEntity } from './common';

export type ProductionComplexity = 'HIGH' | 'LOW' | 'MEDIUM';

export type MarketingAngleCode =
  | 'ASPIRATION'
  | 'BEFORE_AFTER'
  | 'BENEFIT'
  | 'HUMOR'
  | 'IDENTITY'
  | 'LIVE_WOW'
  | 'MYSTERY'
  | 'PAIN_EMPATHY'
  | 'PROOF'
  | 'UNCONVENTIONAL';

export interface ScoreBreakdown {
  clarity: number;
  novelty: number;
  relevance: number;
  trustworthiness: number;
  visualPotential: number;
}

export interface MarketingAngle {
  assumptions: string[];
  audienceReaction: string;
  estimatedProductionComplexity: ProductionComplexity;
  evidenceIds: ID[];
  evidenceLevel: EvidenceLevel;
  expressionTags: string[];
  id: ID;
  missingAssets: string[];
  newApproach?: string;
  oldApproach?: string;
  oneLiner: string;
  openingHook: string;
  primaryCode: MarketingAngleCode;
  prohibitedClaimsHit: string[];
  rationale: string;
  relatedFeatureIds: ID[];
  relatedPainPointIds: ID[];
  score: ScoreBreakdown;
  secondaryCodes: MarketingAngleCode[];
  targetPersonaIds: ID[];
  title: string;
  whyItMatters: string;
}

export interface MarketingAngleSet extends VersionedEntity {
  angles: MarketingAngle[];
  parentRevisionId?: ID;
  projectId: ID;
  referenceAdInsightId?: ID;
  revisionNo: number;
  status: 'APPROVED' | 'DRAFT' | 'STALE';
  understandingRevisionId: ID;
  weak?: boolean;
}

export interface CreativeBrief extends VersionedEntity {
  angleSetId: ID;
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  excludedAngleCodes: MarketingAngleCode[];
  extraInstructions: string;
  marketingGoal: string;
  primaryAngleId: ID;
  prohibitedClaims: string[];
  projectId: ID;
  referenceAdInsightId?: ID;
  riskAcknowledgements: string[];
  secondaryAngleIds: ID[];
  status: 'APPROVED' | 'DRAFT' | 'STALE';
  targetPersonaIds: ID[];
  understandingRevisionId: ID;
}
