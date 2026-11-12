import type { AssetKind, Platform } from '#/types/creative-video';

import { DURATION_OPTIONS } from './project-stage';

export interface ProjectFormValues {
  aspectRatio: string;
  description: string;
  durationSec: number;
  language: string;
  market: string;
  marketingObjective: string;
  negativeGuidance: string;
  platforms: Platform[];
  productName: string;
  productUrl: string;
  rightsConfirmed: boolean;
  stylePreferences: string[];
  targetAudience: string;
  title: string;
}

export function validateProjectForm(
  values: ProjectFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = values.title.trim();
  if (!title) {
    errors.title = '请输入项目名称';
  } else if (title.length > 100) {
    errors.title = '项目名称不能超过 100 个字符';
  }
  if (values.productName && values.productName.length > 100) {
    errors.productName = '产品名称不能超过 100 个字符';
  }
  if (values.description.length > 2000) {
    errors.description = '产品简介最多 2000 字';
  }
  if (values.targetAudience.length > 1000) {
    errors.targetAudience = '目标用户最多 1000 字';
  }
  if (values.negativeGuidance.length > 1000) {
    errors.negativeGuidance = '创作禁区最多 1000 字';
  }
  const urlError = validateProductUrl(values.productUrl);
  if (urlError) {
    errors.productUrl = urlError;
  }
  if (values.platforms.length === 0) {
    errors.platforms = '至少选择一个目标平台';
  }
  if (!DURATION_OPTIONS.includes(values.durationSec)) {
    errors.durationSec = '请选择合法的目标时长';
  }
  if (!values.market) {
    errors.market = '请选择目标市场';
  }
  if (!values.marketingObjective) {
    errors.marketingObjective = '请选择营销目标';
  }
  if (!values.rightsConfirmed) {
    errors.rightsConfirmed = '请先确认资料使用权声明';
  }
  return errors;
}

/**
 * 前端只做格式与协议校验；真实系统必须在服务端做 SSRF、私有 IP 与重定向拦截。
 */
export function validateProductUrl(value: string): '' | string {
  const url = value.trim();
  if (!url) {
    return '';
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return '请输入合法的网址（以 https:// 开头）';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return '只支持 http(s) 网址，不能使用 javascript: 等协议';
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host === '[::1]'
  ) {
    return '不能把本地或内网地址作为自动采集目标';
  }
  if (url.length > 500) {
    return '网址过长，请简化后重试';
  }
  return '';
}

export function createIdempotencyKey(prefix = 'm1'): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.randomUUID) {
    return `${prefix}-${cryptoObject.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ASSET_RULES: Record<
  AssetKind,
  { extensions: string[]; maxBytes: number; mimes: string[] }
> = {
  document: {
    extensions: ['pdf', 'docx', 'txt', 'md', 'pptx'],
    maxBytes: 50 * 1024 * 1024,
    mimes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ],
  },
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxBytes: 20 * 1024 * 1024,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  logo: {
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxBytes: 20 * 1024 * 1024,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  other: {
    extensions: [],
    maxBytes: 20 * 1024 * 1024,
    mimes: [],
  },
  video: {
    extensions: ['mp4', 'mov', 'webm'],
    maxBytes: 500 * 1024 * 1024,
    mimes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
};

export function validateAssetFile(file: File, kind: AssetKind): null | string {
  const rule = ASSET_RULES[kind];
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extensionOk =
    rule.extensions.length === 0 || rule.extensions.includes(extension);
  const mimeOk = rule.mimes.length === 0 || rule.mimes.includes(file.type);
  if (!extensionOk || !mimeOk) {
    return `不支持的文件格式：${file.name}（扩展名与 MIME 需同时符合要求）`;
  }
  if (file.size > rule.maxBytes) {
    return `文件超过 ${Math.round(rule.maxBytes / 1024 / 1024)}MB 上限：${file.name}`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function inferAssetKind(mimeType: string): AssetKind {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return 'document';
}
