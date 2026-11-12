/* oxlint-disable */
// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import * as store from '../store';
const actor = { id: 'demo_owner', username: 'owner', roles: ['owner'] };
beforeEach(() => {
  vi.useFakeTimers();
  store.resetAll();
});
afterEach(() => vi.useRealTimers());
function advance(jobId: string) {
  vi.advanceTimersByTime(20_000);
  return store.getJob(jobId);
}
function fresh() {
  return store.createProject(
    {
      title: 'P0 验收',
      rightsConfirmed: true,
      platforms: ['douyin', 'website'],
      durationSec: 120,
      aspectRatio: '9:16',
    },
    actor,
  );
}

test('M1-PJ-003 combined filters and totals', () => {
  const created = fresh();
  const result = store.getProjectList({
    stage: 'INGEST',
    platform: 'douyin',
    status: 'DRAFT',
  });
  expect(result.items.some((item) => item.id === created.id)).toBe(true);
  expect(result.total).toBe(result.items.length);
  expect(
    result.items.every(
      (item) =>
        item.currentStage === 'INGEST' &&
        item.platforms?.includes('douyin') &&
        item.status === 'DRAFT',
    ),
  ).toBe(true);
});
test('M1-PJ-005/006/007/008 rename, duplicate, archive, restore, soft delete', () => {
  let p = fresh();
  p = store.updateProject(p.id, {
    expectedVersion: p.version,
    patch: { title: '已改名' },
  });
  expect(store.getProject(p.id).title).toBe('已改名');
  expect(p.version).toBe(2);
  store.createDemoSession(p.id, { scenario: 'AUTH_SUCCESS' });
  const copy = store.duplicateProject(p.id, actor, {});
  expect(copy.id).not.toBe(p.id);
  expect(store.getIngestion(copy.id).demoSession).toBeUndefined();
  store.archiveProject(p.id);
  expect(() =>
    store.updateProject(p.id, { patch: { title: '不应成功' } }),
  ).toThrow();
  store.restoreProject(p.id);
  expect(store.getProject(p.id).archivedAt).toBeUndefined();
  store.deleteProject(p.id);
  expect(() => store.getProject(p.id)).toThrow();
  store.undeleteProject(p.id);
  expect(store.getProject(p.id).title).toBe('已改名');
});
test('M1-CR-004/005 optional URL and output settings persist', () => {
  const p = fresh();
  expect(p.productUrl).toBeUndefined();
  expect(p.durationSec).toBe(120);
  expect(p.platforms).toEqual(['douyin', 'website']);
  expect(p.aspectRatio).toBe('9:16');
});
for (const scenario of [
  'PUBLIC_SUCCESS',
  'PARTIAL',
  'LOGIN_REQUIRED',
  'FETCH_FAILED',
]) {
  test(`M1-IG-002/003/004/005 URL state ${scenario}`, () => {
    const p = fresh();
    const result = store.startUrlAnalysis(
      p.id,
      { url: 'https://unknown.example/product', scenario },
      actor,
    );
    expect(store.getJob(result.jobId).status).toBe('QUEUED');
    vi.advanceTimersByTime(500);
    expect(store.getJob(result.jobId).status).toBe('RUNNING');
    const terminal = advance(result.jobId);
    const ingestion = store.getIngestion(p.id);
    expect(terminal.status).toBe(
      scenario === 'FETCH_FAILED' ? 'FAILED' : 'SUCCEEDED',
    );
    expect(ingestion.urlCollectionStatus).toBe(scenario);
    if (scenario === 'FETCH_FAILED') expect(terminal.errorMessage).toBeTruthy();
    else expect(ingestion.sources.length).toBeGreaterThan(0);
  });
}
test('M1-IG-006/007/008/011 unknown URL, resume without polling and source exclusion', () => {
  const p = fresh();
  expect(() => store.startUnderstanding(p.id, {})).toThrow();
  const result = store.startUrlAnalysis(
    p.id,
    { url: 'https://unknown.example/tool', scenario: 'PUBLIC_SUCCESS' },
    actor,
  );
  vi.advanceTimersByTime(20_000);
  const ingestion = store.getIngestion(p.id);
  expect(store.getJob(result.jobId).status).toBe('SUCCEEDED');
  expect(JSON.stringify(store.getEvidenceList(p.id))).not.toContain('3D');
  const source = ingestion.sources[0]!;
  store.updateSource(p.id, source.id, {
    expectedVersion: source.version,
    patch: { includedInAnalysis: false },
  });
  expect(
    store.getIngestion(p.id).sources.find((item) => item.id === source.id)!
      .includedInAnalysis,
  ).toBe(false);
});
for (const scenario of [
  'MFA_REQUIRED',
  'ACCESS_DENIED',
  'NO_DEMO_DATA',
  'SESSION_EXPIRED',
]) {
  test(`M1-AU-003/004 failed authorization ${scenario}`, () => {
    const session = store.createDemoSession('project_crm', { scenario });
    expect(session.status).toBe(
      scenario === 'SESSION_EXPIRED' ? 'EXPIRED' : scenario,
    );
    expect(() => store.exploreDemo('project_crm')).toThrow();
    expect(JSON.stringify(session)).not.toMatch(/password|cookie|accessToken/i);
  });
}
test('M1-AU-002/005/007 authorized then revoked without credentials', () => {
  const session = store.createDemoSession('project_crm', {
    scenario: 'AUTH_SUCCESS',
  });
  expect(session.readOnly).toBe(true);
  expect(session.scopedDomains.length).toBeGreaterThan(0);
  expect(store.exploreDemo('project_crm').nodes.length).toBeGreaterThan(0);
  store.revokeDemoSession('project_crm');
  expect(() => store.exploreDemo('project_crm')).toThrow();
});
for (const [filename, kind, mimeType] of [
  ['image.jpg', 'image', 'image/jpeg'],
  ['image.webp', 'image', 'image/webp'],
  ['video.mp4', 'video', 'video/mp4'],
  ['video.mov', 'video', 'video/quicktime'],
  ['video.webm', 'video', 'video/webm'],
  ['file.pdf', 'document', 'application/pdf'],
  ['file.docx', 'document', 'application/octet-stream'],
  ['file.txt', 'document', 'text/plain'],
  ['file.md', 'document', 'text/plain'],
  ['file.pptx', 'document', 'application/octet-stream'],
]) {
  test(`M1-AS-001/002/003 supported metadata ${filename}`, () => {
    const asset = store.createAsset('project_crm', {
      filename,
      kind,
      mimeType,
      sizeBytes: 100,
    });
    expect(asset.uploadStatus).toBe('SUCCEEDED');
    expect(
      store
        .getIngestion('project_crm')
        .sources.find((source) => source.id === asset.sourceId)!.summary,
    ).toContain('模拟摘要');
  });
}
test('M1-AS-004/005/006/008/010 reject invalid uploads and preserve identity on failures', () => {
  const p = fresh();
  const input = {
    filename: 'same.png',
    kind: 'image',
    mimeType: 'image/png',
    sizeBytes: 100,
  };
  expect(() =>
    store.createAsset(p.id, { ...input, scenario: 'UPLOAD_FAILED' }),
  ).toThrow();
  expect(store.getIngestion(p.id).assets).toHaveLength(0);
  const a = store.createAsset(p.id, input);
  const b = store.createAsset(p.id, input);
  expect(a.id).not.toBe(b.id);
  expect(() =>
    store.createAsset(p.id, { ...input, sizeBytes: 21 * 1024 * 1024 }),
  ).toThrow();
  for (const filename of ['active.svg', 'active.html'])
    expect(() => store.createAsset(p.id, { ...input, filename })).toThrow();
  store.deleteAsset(p.id, a.id);
  expect(
    store.getIngestion(p.id).sources.some((source) => source.id === a.sourceId),
  ).toBe(false);
});
test('M1-UN-002/003/004/010/016/017 failed analysis retries and regional reanalysis preserves old revision', () => {
  const id = 'project_knowledge_base';
  const original = store.listRevisions(id)[0]!;
  const failed = store.startUnderstanding(id, {
    scenario: 'UNDERSTANDING_FAILED',
  });
  expect(advance(failed.jobId).status).toBe('FAILED');
  const succeeded = store.startUnderstanding(id, { scope: 'PAIN_POINTS' });
  advance(succeeded.jobId);
  const reports = store.listRevisions(id);
  expect(reports).toHaveLength(2);
  expect(reports[0]!.painPoints.length).toBeGreaterThanOrEqual(5);
  expect(reports[0]!.features).toEqual(original.features);
  expect(store.getRevision(id, original.id)).toEqual(original);
});
test('M1-UN-008/009/012 unsupported marketing claims cannot be approved and unapproved handoff stays blocked', () => {
  const id = 'project_knowledge_base';
  const draft = store.forkRevision(id, store.listRevisions(id)[0]!.id);
  const updated = store.updateRevision(id, draft.id, {
    expectedVersion: draft.version,
    patch: {
      features: draft.features.map((feature) => ({
        ...feature,
        evidenceLevel: 'unsupported',
        usableInMarketing: true,
      })),
    },
  });
  expect(() =>
    store.approveRevision(
      id,
      draft.id,
      { expectedVersion: updated.version, acceptHypotheses: true },
      actor,
    ),
  ).toThrow();
  expect(store.getHandoff(id)).toBeNull();
  expect(
    updated.painPoints.some((pain) => pain.evidenceLevel === 'hypothesis'),
  ).toBe(true);
});

for (const id of [
  'project_resume_3d',
  'project_knowledge_base',
  'project_crm',
  'project_video_agent',
]) {
  test(`M1-UN-004 Seed report complete sections ${id}`, () => {
    const ingestion = store.getIngestion(id);
    if (!ingestion.lastConfirmedSnapshotId)
      store.confirmIngestion(
        id,
        {
          expectedVersion: ingestion.version,
          includedSourceIds: ingestion.sources
            .filter(
              (source) =>
                source.status === 'READY' && source.includedInAnalysis,
            )
            .map((source) => source.id),
        },
        actor,
      );
    const started = store.startUnderstanding(id, { scope: 'FULL' });
    advance(started.jobId);
    const report = store.listRevisions(id)[0]!;
    expect(report.productSummary.length).toBeGreaterThan(0);
    expect(report.personas.length).toBeGreaterThan(0);
    expect(report.features.length).toBeGreaterThan(0);
    expect(report.painPoints.length).toBeGreaterThanOrEqual(5);
    expect(report.valueAngleSeeds.length).toBeGreaterThan(0);
    expect(report.riskNotes.length).toBeGreaterThan(0);
    expect(report.prohibitedClaims.length).toBeGreaterThan(0);
  });
}
