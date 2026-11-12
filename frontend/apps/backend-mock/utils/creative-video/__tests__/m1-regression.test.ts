/* oxlint-disable */
import { unlinkSync } from 'node:fs';
// @vitest-environment node
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeEach, expect, test, vi } from 'vitest';

const file = join(tmpdir(), `vidcraft-test-${process.pid}-${Date.now()}.json`);
process.env.VIDCRAFT_MOCK_STATE_FILE = file;
const store = await import('../store');
const actor = { id: 'demo_owner', roles: ['owner'], username: 'owner' };
beforeEach(() => store.resetAll());
afterAll(() => {
  unlinkSync(file);
  delete process.env.VIDCRAFT_MOCK_STATE_FILE;
});

test('persistent state restores project and revision data after reset', () => {
  const project = store.createProject(
    { title: '持久化检查', rightsConfirmed: true },
    actor,
  );
  const draft = store.forkRevision(
    'project_resume_3d',
    store.listRevisions('project_resume_3d')[0]!.id,
  );
  store.persistState();
  store.resetAll();
  expect(() => store.getProject(project.id)).toThrow();
  store.restoreState();
  expect(store.getProject(project.id).title).toBe('持久化检查');
  expect(store.getRevision('project_resume_3d', draft.id)).toEqual(draft);
});

test('forking the same revision allocates unique increasing revision numbers', () => {
  const base = store.listRevisions('project_resume_3d')[0]!;
  const a = store.forkRevision('project_resume_3d', base.id);
  const b = store.forkRevision('project_resume_3d', base.id);
  expect(b.revisionNo).toBe(a.revisionNo + 1);
  expect(store.getRevision('project_resume_3d', base.id)).toEqual(base);
});

test('approved revisions cannot be approved again', () => {
  const base = store.listRevisions('project_resume_3d')[0]!;
  expect(() =>
    store.approveRevision(
      'project_resume_3d',
      base.id,
      { expectedVersion: base.version, acceptHypotheses: true },
      actor,
    ),
  ).toThrow();
  expect(store.getRevision('project_resume_3d', base.id)).toEqual(base);
});

test('uploads reject active content, oversized files and missing projects', () => {
  const input = {
    filename: 'unsafe.svg',
    kind: 'image',
    sizeBytes: 100,
    mimeType: 'image/svg+xml',
  };
  expect(() => store.createAsset('project_crm', input)).toThrow();
  expect(() =>
    store.createAsset('project_crm', {
      ...input,
      filename: 'large.png',
      sizeBytes: 21 * 1024 * 1024,
    }),
  ).toThrow();
  expect(() =>
    store.createAsset('missing', { ...input, filename: 'ok.png' }),
  ).toThrow();
});

test('handoff retains marketing restrictions and fact levels', () => {
  const handoff = store.getHandoff('project_resume_3d')!;
  expect(handoff.prohibitedClaims.length).toBeGreaterThan(0);
  expect(handoff.features.every((feature) => feature.evidenceLevel)).toBe(true);
  expect(handoff.painPoints.length).toBeGreaterThanOrEqual(5);
});

test('material changes invalidate handoff without rewriting approved revision contents', () => {
  const base = store.listRevisions('project_resume_3d')[0]!;
  store.createAsset('project_resume_3d', {
    filename: 'new.png',
    kind: 'image',
    sizeBytes: 100,
    mimeType: 'image/png',
  });
  const stale = store.getRevision('project_resume_3d', base.id);
  expect(stale.status).toBe('STALE');
  expect({ ...stale, status: base.status }).toEqual(base);
  expect(store.getHandoff('project_resume_3d')).toBeNull();
});

test('demo exploration requires active authorization and preserves traceable mock evidence', () => {
  expect(() => store.exploreDemo('project_crm')).toThrow();
  store.createDemoSession('project_crm', { scenario: 'AUTH_SUCCESS' });
  const result = store.exploreDemo('project_crm');
  expect(result.nodes[0]!.children[0]!.label).toContain('仪表盘');
  expect(store.exploreDemo('project_crm').sourceId).toBe(result.sourceId);
  expect(
    store.getEvidenceList('project_crm', { sourceId: result.sourceId })[0]!
      .level,
  ).toBe('hypothesis');
  store.revokeDemoSession('project_crm');
  expect(() => store.exploreDemo('project_crm')).toThrow();
});

test('unsupported guesses cannot become verified facts without evidence', () => {
  const revision = store.forkRevision(
    'project_resume_3d',
    store.listRevisions('project_resume_3d')[0]!.id,
  );
  const pains = revision.painPoints.map((pain) => ({
    ...pain,
    evidenceLevel: 'verified',
    sourceEvidenceIds: [],
  }));
  expect(() =>
    store.updateRevision('project_resume_3d', revision.id, {
      expectedVersion: revision.version,
      patch: { painPoints: pains },
    }),
  ).toThrow();
  expect(store.getRevision('project_resume_3d', revision.id)).toEqual(revision);
});

test('review comments remain available without changing approved content or version', () => {
  const base = store.listRevisions('project_resume_3d')[0]!;
  const updated = store.addRevisionComment(
    'project_resume_3d',
    base.id,
    { note: '追加审核意见', expectedVersion: base.version },
    actor,
  );
  expect(updated.version).toBe(base.version);
  expect(updated.productSummary).toBe(base.productSummary);
  expect(updated.approvedAt).toBe(base.approvedAt);
  expect(updated.reviewLog!.at(-1)!.note).toBe('追加审核意见');
});

test('covers accept only project images and retain the reference', () => {
  const project = store.getProject('project_crm');
  const image = store.createAsset(project.id, {
    filename: 'cover.png',
    kind: 'image',
    sizeBytes: 100,
    mimeType: 'image/png',
  });
  const updated = store.updateProject(project.id, {
    expectedVersion: project.version,
    patch: { coverAssetId: image.id },
  });
  expect(updated.coverAssetId).toBe(image.id);
  expect(store.getProject(project.id).coverAssetId).toBe(image.id);
  expect(() =>
    store.updateProject(project.id, {
      expectedVersion: updated.version,
      patch: { coverAssetId: 'missing' },
    }),
  ).toThrow();
  const cleared = store.updateProject(project.id, {
    expectedVersion: updated.version,
    patch: { coverAssetId: '' },
  });
  expect(cleared.coverAssetId).toBeUndefined();
});

test('analysis keeps the starting snapshot when newer materials are confirmed', () => {
  vi.useFakeTimers();
  try {
    const id = 'project_knowledge_base';
    const before = store.getIngestion(id);
    const job = store.startUnderstanding(id, {
      ingestionSnapshotId: before.lastConfirmedSnapshotId,
    });
    store.createAsset(id, {
      filename: 'later.png',
      kind: 'image',
      sizeBytes: 100,
      mimeType: 'image/png',
    });
    const changed = store.getIngestion(id);
    expect(() =>
      store.startUnderstanding(id, {
        ingestionSnapshotId: before.lastConfirmedSnapshotId,
      }),
    ).toThrow();
    store.confirmIngestion(
      id,
      {
        expectedVersion: changed.version,
        includedSourceIds: changed.sources
          .filter(
            (source) => source.includedInAnalysis && source.status === 'READY',
          )
          .map((source) => source.id),
      },
      actor,
    );
    vi.advanceTimersByTime(20_000);
    store.getJob(job.jobId);
    expect(store.listRevisions(id)[0]!.ingestionSnapshotId).toBe(
      before.lastConfirmedSnapshotId,
    );
  } finally {
    vi.useRealTimers();
  }
});

test('user-added claims have user provenance and cannot invent external evidence', () => {
  const id = 'project_resume_3d';
  const draft = store.forkRevision(id, store.listRevisions(id)[0]!.id);
  const newPain = {
    ...draft.painPoints[0]!,
    id: 'pain_user_new',
    painPoint: '用户访谈提供的痛点',
    evidenceLevel: 'hypothesis',
    sourceEvidenceIds: [],
  };
  const updated = store.updateRevision(id, draft.id, {
    expectedVersion: draft.version,
    patch: { painPoints: [...draft.painPoints, newPain] },
  });
  const pain = updated.painPoints.at(-1)!;
  expect(pain.evidenceLevel).toBe('user_confirmed');
  const evidence = store
    .getEvidenceList(id, {})
    .find((item) => item.id === pain.sourceEvidenceIds[0])!;
  expect(evidence.addedBy).toBe('user');
  expect(
    store
      .getIngestion(id)
      .sources.find((item) => item.id === evidence.sourceId)!.kind,
  ).toBe('USER_NOTE');
});

test('natural demo expiry is visible while retaining historical sources', () => {
  vi.useFakeTimers();
  try {
    store.createDemoSession('project_crm', { scenario: 'AUTH_SUCCESS' });
    const explored = store.exploreDemo('project_crm');
    vi.advanceTimersByTime(31 * 60 * 1000);
    const ingestion = store.getIngestion('project_crm');
    expect(ingestion.demoSession!.status).toBe('EXPIRED');
    expect(
      ingestion.sources.find((item) => item.id === explored.sourceId)!.summary,
    ).toContain('过期');
    expect(() => store.exploreDemo('project_crm')).toThrow();
  } finally {
    vi.useRealTimers();
  }
});

test('asset notes and classification keep identity and reject incompatible formats', () => {
  const asset = store.createAsset('project_crm', {
    filename: 'brand.png',
    kind: 'image',
    sizeBytes: 100,
    mimeType: 'image/png',
  });
  const updated = store.updateAsset('project_crm', asset.id, {
    expectedVersion: asset.version,
    patch: { kind: 'logo', purpose: '品牌片尾' },
  });
  expect(updated.id).toBe(asset.id);
  expect(updated.purpose).toBe('品牌片尾');
  expect(
    store
      .getIngestion('project_crm')
      .sources.find((item) => item.id === asset.sourceId)!.kind,
  ).toBe('BRAND_ASSET');
  expect(() =>
    store.updateAsset('project_crm', asset.id, {
      expectedVersion: updated.version,
      patch: { kind: 'video' },
    }),
  ).toThrow();
});

test('removed report suggestions retain full contents, actor and timestamp and can be restored', () => {
  const id = 'project_resume_3d';
  const draft = store.forkRevision(id, store.listRevisions(id)[0]!.id);
  const removed = draft.painPoints[0]!;
  const edited = store.updateRevision(id, draft.id, {
    expectedVersion: draft.version,
    actorId: actor.id,
    patch: { painPoints: draft.painPoints.slice(1) },
  });
  const history = edited.deletionHistory![0]!;
  expect(history.content).toEqual(removed);
  expect(history.by).toBe(actor.id);
  expect(Date.parse(history.at)).toBeGreaterThan(0);
  const restored = store.updateRevision(id, draft.id, {
    expectedVersion: edited.version,
    actorId: actor.id,
    patch: { painPoints: [removed, ...edited.painPoints] },
  });
  expect(restored.painPoints[0]).toEqual(removed);
  expect(restored.deletionHistory).toEqual(edited.deletionHistory);
  store.persistState();
  store.resetAll();
  store.restoreState();
  expect(store.getRevision(id, draft.id).deletionHistory).toEqual(
    edited.deletionHistory,
  );
});

test('confirmed snapshots preserve source, asset and evidence content after live sources are changed or removed', () => {
  const id = 'project_resume_3d';
  const ingestion = store.getIngestion(id);
  const snapshot = store.confirmIngestion(
    id,
    {
      expectedVersion: ingestion.version,
      includedSourceIds: ingestion.sources
        .filter((source) => source.includedInAnalysis)
        .map((source) => source.id),
    },
    actor,
  );
  expect(snapshot.completeness).toBe('COMPLETE');
  expect(snapshot.sourceCopies!.length).toBeGreaterThan(0);
  expect(snapshot.evidenceCopies!.length).toBeGreaterThan(0);
  const asset = ingestion.assets[0]!;
  store.updateAsset(id, asset.id, {
    expectedVersion: asset.version,
    patch: { filename: 'changed.png' },
  });
  store.deleteAsset(id, asset.id, {});
  expect(
    store.getSnapshots(id).find((item) => item.id === snapshot.id),
  ).toEqual(snapshot);
  store.persistState();
  store.resetAll();
  store.restoreState();
  expect(
    store.getSnapshots(id).find((item) => item.id === snapshot.id),
  ).toEqual(snapshot);
});
