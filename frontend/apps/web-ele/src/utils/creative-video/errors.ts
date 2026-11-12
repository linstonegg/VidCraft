import type { ApiCode } from '#/types/creative-video';

import { BusinessApiError } from '#/api/creative-video/client';

/**
 * 统一错误文案（中文优先）。
 * 页面与占位组件只消费这里的结果，不允许各自判断 code 或拼接堆栈。
 */
const CODE_MESSAGES: Record<ApiCode, string> = {
  ASSET_CONTENT_UNAVAILABLE: '素材内容不可用，请重新选择或恢复原始文件',
  ASSET_CROSS_PROJECT_DENIED: '不能引用其他项目的素材',
  ASSET_RIGHTS_REVOKED: '素材展示权已撤销，仅保留安全元数据',
  ASSET_REFERENCE_IN_USE: '素材仍被已批准或草稿内容引用，请先查看影响',
  CLAIM_BLOCKED: '存在被阻塞的宣传主张，不能用于正式生产',
  CONCEPT_CROSS_BRIEF_COMPOSITION_DENIED:
    '只能组合同一项目、同一 Brief 下的创意方案',
  CONCEPT_GROUP_MEMBERSHIP_CONFLICT: '创意草稿未能加入原方案组，请刷新后重试',
  CONFLICT_DECISION_INCOMPLETE: '裁决需要完整原因、适用范围或安全改写',
  CONFLICT_UNRESOLVED: '仍有未解决的宣传冲突',
  EVIDENCE_NOT_FOUND: '证据来源不存在或无权访问',
  EVIDENCE_VERSION_UNRESOLVED: '历史证据来源版本无法证实',
  GENERATION_SPEC_OUTDATED: '生成建议规格已过期，请重新检查正式镜头引用',
  MOCK_SCENARIO_UNAVAILABLE: '演示场景不可用，已恢复默认场景',
  MOODBOARD_ASSET_VERSION_MISMATCH: '情绪板内容版本不属于该素材',
  PAID_GENERATION_NOT_AVAILABLE: 'M2.1 不提供真实付费生成',
  QUESTION_ALREADY_ANSWERED: '该问题已有答案，请查看现有回答',
  QUESTION_OPTION_INVALID: '问题选项已更新，请重新选择或补充文本',
  REFERENCE_AD_RIGHTS_NOT_CONFIRMED: '参考广告的分析/使用权限未确认',
  RESEARCH_PERMISSION_DENIED: '当前角色无权提交研究访谈',
  RESEARCH_STALE_VERSION: '资料上下文已变化，请刷新后重试',
  REVIEW_EXPECTED_VERSION_CONFLICT: '审核版本已变化，请查看最新版本',
  STORYBOARD_REORDER_BEAT_CONFLICT: '本期只允许在同一故事节拍内排序',
  STORYBOARD_REORDER_INVALID_TRANSITION: '转场或时长不合法，不能提交排序',
  ASSET_NOT_FOUND: '素材不存在，请重新选择或刷新后重试',
  CONFLICT: '操作与当前状态冲突，请刷新后重试',
  FORBIDDEN: '当前演示角色无权执行该操作',
  IDEMPOTENCY_CONFLICT: '相同请求键对应了不同内容，请使用新的请求重新发起',
  INTERNAL_ERROR: '演示服务暂时不可用，请重试',
  MOCK_PROCESSING_FAILED: '模拟任务失败，可以重试或返回修改资料',
  NOT_FOUND: '请求的内容不存在或已被移除',
  NO_VALID_SOURCE: '当前没有参与分析的有效资料，请先补充并确认资料',
  OK: '请求成功',
  PROJECT_NOT_FOUND: '项目不存在或已被移除',
  RATE_LIMITED: '操作过于频繁，请稍后再试',
  SERVICE_UNAVAILABLE: '演示服务不可用，请确认 Mock 服务已启动',
  UNAUTHORIZED: '登录状态已失效，请重新登录',
  UNDERSTANDING_NOT_READY: '产品理解尚未满足确认条件，请补充功能或用户画像',
  UNSUPPORTED_CLAIM: '存在不可作为确定性主张的内容仍被用于宣传',
  VALIDATION_ERROR: '提交的内容不完整或格式不正确',
  VERSION_CONFLICT: '版本已变化，请刷新后合并修改',
};

const NETWORK_MESSAGE = '演示服务暂时不可用，请确认 Mock 服务已启动后重试';
const TIMEOUT_MESSAGE = '请求超时，请确认 Mock 服务是否已启动';

export function isBusinessApiError(error: unknown): error is BusinessApiError {
  return error instanceof BusinessApiError;
}

export function getBusinessErrorCode(
  error: unknown,
): 'NETWORK_ERROR' | 'UNKNOWN' | ApiCode {
  if (isBusinessApiError(error)) {
    return error.code;
  }
  return 'UNKNOWN';
}

export function friendlyErrorMessage(error: unknown): string {
  if (!isBusinessApiError(error)) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) {
        return TIMEOUT_MESSAGE;
      }
      if (message.includes('network') || message.includes('failed to fetch')) {
        return NETWORK_MESSAGE;
      }
      return error.message || NETWORK_MESSAGE;
    }
    return NETWORK_MESSAGE;
  }

  if (error.code === 'NETWORK_ERROR') {
    return error.message.toLowerCase().includes('timeout')
      ? TIMEOUT_MESSAGE
      : NETWORK_MESSAGE;
  }

  return CODE_MESSAGES[error.code] ?? NETWORK_MESSAGE;
}

export function isNotFoundError(error: unknown): boolean {
  const code = getBusinessErrorCode(error);
  return code === 'NOT_FOUND' || code === 'PROJECT_NOT_FOUND';
}

export function isVersionConflict(error: unknown): boolean {
  return getBusinessErrorCode(error) === 'VERSION_CONFLICT';
}
