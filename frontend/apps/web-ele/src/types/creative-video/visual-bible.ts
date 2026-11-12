import type { ID, VersionedEntity } from './common';

export interface CharacterBible {
  clothing: string;
  id: ID;
  imageAssetIds: ID[];
  look: string;
  mustRemainConsistent: string[];
  name: string;
  personality: string;
}

export interface SceneBible {
  id: ID;
  keyObjects: string[];
  lighting: string;
  mood: string;
  name: string;
  referenceAssetIds: ID[];
}

export interface VisualBibleRevision extends VersionedEntity {
  aspectRatio: '1:1' | '9:16' | '16:9';
  brandColors: string[];
  brandLogoAssetIds: ID[];
  characters: CharacterBible[];
  musicAndSfxGuidance: string;
  narrationGuidance: string;
  parentRevisionId?: ID;
  projectId: ID;
  revisionNo: number;
  scenes: SceneBible[];
  scriptRevisionId: ID;
  status: 'APPROVED' | 'DRAFT' | 'STALE';
  subtitleSafeAreaPercent: number;
  targetFps: number;
  typographyGuidance: string;
  visualLanguageTags: string[];
}
