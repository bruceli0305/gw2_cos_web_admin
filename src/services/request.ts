// src/services/request.ts
import { message } from 'antd';

export const TOKEN_KEY = 'gw2_admin_token';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

const SILENT_ERROR_URLS = new Set([
  '/admin/v1/auth/login',
]);

export async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let fetchUrl = url;
  if (options.params) {
    const params = new URLSearchParams();
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    });
    fetchUrl += `?${params.toString()}`;
  }

  try {
    const response = await fetch(fetchUrl, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('未登录');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));

      // 强制改密：自动跳转
      if (
        response.status === 403 &&
        errorBody?.message === '需要修改密码' &&
        window.location.pathname !== '/change-password'
      ) {
        window.location.href = '/change-password';
      }

      const msg = String((errorBody as any)?.message || `请求失败: ${response.status}`);
      throw new Error(msg);
    }

    const body = await response.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new Error('后端响应格式错误');
    }

    // 统一 envelope：{ statusCode, code, data }
    const code = String((body as any).code || '').trim();
    if (code && code !== '0') {
      throw new Error(String((body as any).message || '请求错误'));
    }
    if (!('data' in (body as any))) {
      throw new Error('后端响应缺少 data');
    }
    return (body as any).data as T;
  } catch (error: any) {
    if (!SILENT_ERROR_URLS.has(url)) {
      message.error(error.message || '网络请求错误');
    }
    throw error;
  }
}