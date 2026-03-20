import { redirectToLogin, refreshAuthSession } from '../auth/cognitoAuth';
import { getAuthSession } from '../auth/authSession';

type ApiClientConfig = {
  baseUrl: string;
  defaultHeaders?: HeadersInit;
  timeoutMs?: number;
};

export type ApiClientResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ApiClientError };

export class ApiClientError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders?: HeadersInit;
  private readonly timeoutMs: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultHeaders = config.defaultHeaders;
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async request<T>(path: string, init: RequestInit = {}, hasRetried = false): Promise<T> {
    const response = await this.performRequest(path, init);

    if (response.status === 401 && !hasRetried) {
      const refreshedSession = await refreshAuthSession();
      if (refreshedSession?.accessToken) {
        return this.request<T>(path, init, true);
      }

      await redirectToLogin();
    }

    if (!response.ok) {
      const payload = await this.parseResponse(response);
      throw new ApiClientError(`API request failed: ${response.status}`, response.status, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return this.parseResponse(response) as Promise<T>;
  }

  private performRequest(path: string, init: RequestInit = {}) {
    const accessToken = getAuthSession().accessToken;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), this.timeoutMs);

    return fetch(new URL(path, this.baseUrl).toString(), {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...this.defaultHeaders,
        ...init.headers,
      },
    }).finally(() => {
      window.clearTimeout(timeout);
    });
  }

  async requestSafe<T>(path: string, init: RequestInit = {}): Promise<ApiClientResult<T>> {
    try {
      const data = await this.request<T>(path, init);
      return {
        ok: true,
        data,
        status: 200,
      };
    } catch (error) {
      if (error instanceof ApiClientError) {
        return {
          ok: false,
          error,
        };
      }

      throw error;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async parseResponse(response: Response) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }
}

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
  timeoutMs: 10_000,
});
