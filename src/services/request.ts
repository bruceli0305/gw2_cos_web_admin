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

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
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
      throw new Error(errorBody.message || `请求失败: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    if (!SILENT_ERROR_URLS.has(url)) {
      message.error(error.message || '网络请求错误');
    }
    throw error;
  }
}