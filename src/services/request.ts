export const TOKEN_KEY = 'gw2_admin_token';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
}

type ApiEnvelope<T> = {
  code?: string | number;
  message?: string;
  data?: T;
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type LegacyApiResult = any;

const SILENT_ERROR_URLS = new Set([
  '/admin/v1/auth/login',
]);

let messageApiPromise: Promise<typeof import('antd')['message']> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown, fallback = 'Network request failed') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

async function notifyRequestError(content: string) {
  try {
    if (!messageApiPromise) {
      messageApiPromise = import('antd').then((mod) => mod.message);
    }
    const messageApi = await messageApiPromise;
    messageApi.error(content);
  } catch {
    console.error(content);
  }
}

export async function request<T = LegacyApiResult>(url: string, options: RequestOptions = {}): Promise<T> {
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
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
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
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage =
        isRecord(errorBody) && typeof errorBody.message === 'string'
          ? errorBody.message
          : `Request failed: ${response.status}`;

      if (
        response.status === 403 &&
        errorMessage === 'Password change required' &&
        window.location.pathname !== '/change-password'
      ) {
        window.location.href = '/change-password';
      }

      throw new Error(errorMessage);
    }

    const body = await response.json().catch(() => null);
    if (!isRecord(body)) {
      throw new Error('Invalid response format');
    }

    const envelope = body as ApiEnvelope<T>;
    const code = String(envelope.code || '').trim();
    if (code && code !== '0') {
      throw new Error(String(envelope.message || 'Request failed'));
    }
    if (!('data' in body)) {
      throw new Error('Response missing data');
    }

    return envelope.data as T;
  } catch (error: unknown) {
    if (!SILENT_ERROR_URLS.has(url)) {
      void notifyRequestError(getErrorMessage(error));
    }
    throw error;
  }
}
