import type { RequestClientConfig } from '@vben/request';

import type { ApiCode, ApiResponse } from '#/types/creative-video/common';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import { RequestClient } from '@vben/request';
import { useAccessStore } from '@vben/stores';

/**
 * VidCraft 业务接口统一适配层。
 *
 * 背景：Vben 自带的 `requestClient` 按数值 `code: 0` 判定成功，并直接返回 `data`；
 * 本项目业务契约使用字符串 `code: 'OK'`。两者不能混用，因此这里单独创建一个
 * 只服务 `/creative-video/v1/**` 的 RequestClient：
 * - 不注册 Vben 的数值 code 响应拦截器，避免“HTTP 200 却被当失败”；
 * - 保留 AxiosResponse，先看 HTTP 状态码，再校验业务 code；
 * - 统一抛出 BusinessApiError，页面只消费 `friendlyErrorMessage()`。
 *
 * 登录、刷新 token 等认证链路仍使用 `#/api/request` 中的 `requestClient`，互不影响。
 */
const BUSINESS_BASE_PATH = '/creative-video/v1';

export class BusinessApiError extends Error {
  /** 业务错误码；网络异常时为 NETWORK_ERROR */
  public readonly code: 'NETWORK_ERROR' | ApiCode;
  public readonly requestId?: string;
  /** HTTP 状态码；网络异常时为 0 */
  public readonly status: number;

  constructor(
    message: string,
    options: {
      code: 'NETWORK_ERROR' | ApiCode;
      requestId?: string;
      status: number;
    },
  ) {
    super(message);
    this.name = 'BusinessApiError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export const businessRequestClient = new RequestClient({
  baseURL: apiURL,
  responseReturn: 'raw',
  timeout: 20_000,
  // 由适配层统一读取状态码，避免 4xx 被 Axios 提前抛出后丢失状态
  validateStatus: () => true,
});

businessRequestClient.addRequestInterceptor({
  fulfilled: async (config) => {
    const accessStore = useAccessStore();
    config.headers.Authorization = accessStore.accessToken
      ? `Bearer ${accessStore.accessToken}`
      : null;
    config.headers['Accept-Language'] = preferences.app.locale;
    return config;
  },
});

function buildUrl(path: string) {
  return path.startsWith('/')
    ? `${BUSINESS_BASE_PATH}${path}`
    : `${BUSINESS_BASE_PATH}/${path}`;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    !!value &&
    typeof value === 'object' &&
    'code' in value &&
    typeof (value as ApiResponse<T>).code === 'string'
  );
}

/** 只依赖 AxiosResponse 的最小结构，避免 web-ele 直接依赖 axios 包 */
interface BusinessHttpResponse<T> {
  data: ApiResponse<T>;
  status: number;
}

/** 统一执行一次业务请求，校验 HTTP 状态与业务 code，返回 data */
export async function requestBusinessData<T>(
  path: string,
  config: RequestClientConfig = {},
): Promise<T> {
  let response: BusinessHttpResponse<T>;

  try {
    response = (await businessRequestClient.instance.request({
      ...config,
      url: buildUrl(path),
    })) as unknown as BusinessHttpResponse<T>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '网络请求失败，请稍后重试';
    const code =
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('network')
        ? 'NETWORK_ERROR'
        : 'INTERNAL_ERROR';
    throw new BusinessApiError(message, { code, status: 0 });
  }

  if (response.status === 401) {
    const accessStore = useAccessStore();
    if (accessStore.accessToken) {
      accessStore.setAccessToken(null);
      const { useAuthStore } = await import('#/store/auth');
      await useAuthStore().logout();
    }
  }
  const body: unknown = response.data;

  if (!isApiResponse<T>(body)) {
    throw new BusinessApiError('演示服务返回了无法识别的数据格式', {
      code: 'INTERNAL_ERROR',
      status: response.status,
    });
  }

  if (response.status < 200 || response.status >= 300 || body.code !== 'OK') {
    throw new BusinessApiError(body.message || '业务请求失败', {
      code: body.code,
      requestId: body.requestId,
      status: response.status,
    });
  }

  return body.data;
}

export function getBusinessData<T>(path: string, config?: RequestClientConfig) {
  return requestBusinessData<T>(path, { ...config, method: 'GET' });
}

export function postBusinessData<T>(
  path: string,
  data?: unknown,
  config?: RequestClientConfig,
) {
  return requestBusinessData<T>(path, { ...config, data, method: 'POST' });
}

export function patchBusinessData<T>(
  path: string,
  data?: unknown,
  config?: RequestClientConfig,
) {
  return requestBusinessData<T>(path, { ...config, data, method: 'PATCH' });
}

export function putBusinessData<T>(
  path: string,
  data?: unknown,
  config?: RequestClientConfig,
) {
  return requestBusinessData<T>(path, { ...config, data, method: 'PUT' });
}

export function deleteBusinessData<T>(
  path: string,
  data?: unknown,
  config?: RequestClientConfig,
) {
  return requestBusinessData<T>(path, { ...config, data, method: 'DELETE' });
}
