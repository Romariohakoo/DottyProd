import axios, { AxiosError } from "axios";

import { API_BASE_URL } from "../config/env";
import { camelToSnake, convertKeys, snakeToCamel } from "../lib/case-converter";

export const UNKNOWN_ERROR = "UNKNOWN_ERROR";

const ACCESS_TOKEN_KEY = "accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;

export function setOnUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

const API_PREFIX = "/api";

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const response = await axios.post<{ access_token: string }>(
        `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
        undefined,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      setAccessToken(response.data.access_token);
      return true;
    } catch {
      clearAccessToken();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export interface ErrorData {
  detail?: Array<{
    loc: Array<string | number>;
    msg: string;
    type: string;
  }>;
  message?: string;
}

const api = axios.create({
  baseURL: API_BASE_URL + API_PREFIX,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  config.data = convertKeys(config.data, camelToSnake);
  const accessToken = getAccessToken();
  if (accessToken) {
    // config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = convertKeys(response.data, snakeToCamel);
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

      const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) =>
        (config?.url ?? "").includes(endpoint),
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
        clearAccessToken();
        unauthorizedListener?.();
      }

      if (error.response?.data) {
        error.response.data = convertKeys(
          error.response.data,
          snakeToCamel,
        ) as ErrorData;
        const message = (error.response.data as ErrorData).message;
        if (message) {
          error.message = message;
        }
      }

      return Promise.reject(error);
    }

    return Promise.reject(Error(UNKNOWN_ERROR));
  },
);

export default api;
