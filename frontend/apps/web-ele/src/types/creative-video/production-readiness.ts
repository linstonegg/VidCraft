import type { EffectiveValidity, ID, ISODateTime } from './common';

export interface ReadinessItem {
  actionRoute?: string;
  affectedShotIds?: ID[];
  key: string;
  label: string;
  reason?: string;
  status: 'BLOCKED' | 'FUTURE' | 'NOT_APPLICABLE' | 'PASS' | 'WARN';
}

export interface ProductionReadiness {
  animaticSnapshotId?: ID;
  canEnterM3: boolean;
  effectiveValidity: EffectiveValidity;
  evaluatedAt: ISODateTime;
  hasUnapprovedDrafts?: boolean;
  items: ReadinessItem[];
  projectId: ID;
  storyboardRevisionId?: ID;
  understandingRevisionId: ID;
}
