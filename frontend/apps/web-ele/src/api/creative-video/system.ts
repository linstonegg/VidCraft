import type { DemoRole, ServiceHealth } from '#/types/creative-video';

import { getBusinessData } from './client';

/**
 * Mock 服务健康检查。可选传入 delay 模拟慢响应（由 Mock 端限制上限）。
 */
export function getServiceHealth(options?: { delay?: number }) {
  return getBusinessData<ServiceHealth>('/health', {
    params: options?.delay ? { delay: options.delay } : undefined,
  });
}

/**
 * 演示角色清单（仅非真实演示标识）。
 */
export function listDemoRoles() {
  return getBusinessData<DemoRole[]>('/demo/users');
}

/**
 * 触发一次模拟 403，用于验收“角色无权限”提示。
 */
export function requestForbiddenDemo() {
  return getBusinessData<never>('/demo/forbidden');
}
