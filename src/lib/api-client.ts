/**
 * Base API client with fetch wrapper for the commission calculator app.
 * All API requests go through this module for consistent error handling and typing.
 */

const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Build a URL with query parameters.
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.pathname + url.search;
}

/**
 * Parse the response and throw on error status codes.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const errorData = await response.json();
      throw new ApiError(
        errorData.error || errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status
    );
  }

  if (isJson) {
    return response.json() as Promise<T>;
  }

  return undefined as unknown as T;
}

/**
 * GET request with optional query parameters.
 */
export async function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<T>(response);
}

/**
 * POST request with JSON body.
 */
export async function post<T>(
  path: string,
  data?: unknown
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * PUT request with JSON body.
 */
export async function put<T>(
  path: string,
  data?: unknown
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * DELETE request with optional query parameters.
 */
export async function del<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<T>(response);
}

const apiClient = { get, post, put, del };
export default apiClient;
