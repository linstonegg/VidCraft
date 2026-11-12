export const CURRENT_SCHEMA_VERSION = 3;

/**
 * Normalize persisted Mock state for schema 1/2/3.
 * Pure function so the migration can be tested without booting Nitro.
 */
export function normalizePersistedMockState(saved: any) {
  if (
    !saved ||
    ![1, 2, 3].includes(saved.schemaVersion) ||
    !Array.isArray(saved.state?.projects)
  ) {
    throw new Error('Mock 数据格式不兼容，请备份并移除本地状态文件后重启');
  }
  const state = saved.state;
  return {
    isLegacy: saved.schemaVersion < CURRENT_SCHEMA_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    state: {
      ...state,
      m11: state.m11 ?? {},
      m21: state.m21 ?? {},
    },
  };
}
