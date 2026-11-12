import type { Platform } from '#/types/creative-video';

export const PLATFORM_KEYS: Record<Platform, string> = {
  bilibili: 'vidcraft.platform.bilibili',
  douyin: 'vidcraft.platform.douyin',
  other: 'vidcraft.platform.other',
  sales: 'vidcraft.platform.sales',
  tiktok: 'vidcraft.platform.tiktok',
  website: 'vidcraft.platform.website',
  wechat_channels: 'vidcraft.platform.wechat_channels',
};

/**
 * 秒数转可读时长：90 → "1 分 30 秒"，45 → "45 秒"。
 * 页面只做展示，不做取整以外的业务计算。
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—';
  }
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} 分` : `${minutes} 分 ${rest} 秒`;
}

/**
 * ISO 时间转本地展示时间（YYYY-MM-DD HH:mm）。
 * 统一使用 ISO 输入，避免各页面自行解析。
 */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function truncateText(value: string, max = 42): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}…`;
}
