import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizePersistedMockState } from '../../../../../backend-mock/utils/creative-video/state-migration';

const schema2 = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'tests/fixtures/mock-state-schema2.json'),
    'utf8',
  ),
) as any;

describe('normalizePersistedMockState', () => {
  it('migrates schema2 state and preserves existing projects', () => {
    const result = normalizePersistedMockState(schema2);
    expect(result.isLegacy).toBe(true);
    expect(result.schemaVersion).toBe(3);
    expect(result.state.projects[0]?.id).toBe('legacy_project');
    expect(result.state.m11).toEqual({});
    expect(result.state.m21).toEqual({});
  });

  it('keeps schema3 m11/m21 buckets', () => {
    const result = normalizePersistedMockState({
      ...schema2,
      schemaVersion: 3,
      state: {
        ...schema2.state,
        m11: { seeded: true },
        m21: { seeded: true },
      },
    });
    expect(result.isLegacy).toBe(false);
    expect(result.state.m11).toEqual({ seeded: true });
    expect(result.state.m21).toEqual({ seeded: true });
  });

  it('rejects incompatible state files', () => {
    expect(() =>
      normalizePersistedMockState({ schemaVersion: 99, state: {} }),
    ).toThrow('Mock 数据格式不兼容');
  });
});
