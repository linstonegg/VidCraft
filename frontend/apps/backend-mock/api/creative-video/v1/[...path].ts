import { defineEventHandler } from 'h3';
import { handleCreativeVideoRequest } from '~/utils/creative-video/router';

/**
 * VidCraft M1 业务 Mock 统一入口：
 * 所有 /api/creative-video/v1/** 请求由 router 按 method + path 分发，
 * 便于集中处理鉴权、版本锁、幂等和演示场景。
 */
export default defineEventHandler((event) => {
  return handleCreativeVideoRequest(event);
});
