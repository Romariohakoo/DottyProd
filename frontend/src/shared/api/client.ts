import axios, { AxiosError } from 'axios';

import { API_BASE_URL } from '../config/env';
import {
  convertKeys,
  snakeToCamel,
} from '../lib/case-converter';

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

export type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null =
  null;

export function setOnUnauthorized(
  listener: UnauthorizedListener,
): void {
  unauthorizedListener = listener;
}

const API_PREFIX = '/api';

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      await axios.post(
        `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
        undefined,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export interface ErrorData {
  code: string;
  message: string;
  path: string;
  timestamp: string;
  traceId: string;
}

const api = axios.create({
  baseURL: API_BASE_URL + API_PREFIX,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = convertKeys(
        response.data,
        snakeToCamel,
      );
    }
    return response;
  },
  async (error) => {
    if (error instanceof AxiosError) {
      const config = error.config as
        | (typeof error.config & {
            _retry?: boolean;
          })
        | undefined;

      const isAuthEndpoint = AUTH_ENDPOINTS.some(
        (endpoint) =>
          (config?.url ?? '').includes(endpoint),
      );

      if (
        error.response?.status === 401 &&
        config &&
        !config._retry &&
        !isAuthEndpoint
      ) {
        config._retry = true;
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return api.request(config);
        }
        unauthorizedListener?.();
      }

      if (error.response?.data) {
        error.response.data = convertKeys(
          error.response.data,
          snakeToCamel,
        ) as ErrorData;
        if ((error.response.data as ErrorData).message) {
          error.message = (
            error.response.data as ErrorData
          ).message;
        }
      }

      return Promise.reject(error);
    }

    return Promise.reject(Error(UNKNOWN_ERROR));
  },
);

export default api;
