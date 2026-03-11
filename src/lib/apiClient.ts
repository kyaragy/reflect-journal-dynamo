import { getAuthSession } from '../auth/authSession';

type ApiClientConfig = {
  baseUrl: string;
  defaultHeaders?: HeadersInit;
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

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.defaultHeaders = config.defaultHeaders;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const accessToken = getAuthSession().accessToken;
    const response = await fetch(new URL(path, this.baseUrl).toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...this.defaultHeaders,
        ...init.headers,
      },
    });

    if (!response.ok) {
      const payload = await this.parseResponse(response);
      throw new ApiClientError(`API request failed: ${response.status}`, response.status, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return this.parseResponse(response) as Promise<T>;
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
});
