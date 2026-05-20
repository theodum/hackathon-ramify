// =============================================================
// GREENPULSE — Axios Client
// =============================================================

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ─────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('greenpulse-auth');
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state?.state?.tokens?.accessToken ?? null;
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem('greenpulse-auth');
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state?.state?.tokens?.refreshToken ?? null;
  } catch {
    return null;
  }
}

function setTokens(accessToken: string, refreshToken: string) {
  try {
    const raw = localStorage.getItem('greenpulse-auth');
    if (!raw) return;
    const state = JSON.parse(raw);
    state.state.tokens = { ...state.state.tokens, accessToken, refreshToken };
    localStorage.setItem('greenpulse-auth', JSON.stringify(state));
  } catch {
    // silently fail
  }
}

function clearAuth() {
  try {
    const raw = localStorage.getItem('greenpulse-auth');
    if (!raw) return;
    const state = JSON.parse(raw);
    state.state = { user: null, tokens: null, isAuthenticated: false };
    localStorage.setItem('greenpulse-auth', JSON.stringify(state));
  } catch {
    // silently fail
  }
}

// ─────────────────────────────────────────
// Request interceptor — attach Bearer token
// ─────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────
// Response interceptor — handle 401 & refresh
// ─────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${BASE_URL}/api/auth/refresh`,
          { refreshToken },
        );

        setTokens(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${data.accessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize error
    const apiErr: ApiError = {
      statusCode: error.response?.status ?? 0,
      message:
        (error.response?.data as ApiError | undefined)?.message
        ?? error.message
        ?? 'Une erreur inattendue est survenue',
      error: (error.response?.data as ApiError | undefined)?.error,
    };

    return Promise.reject(apiErr);
  },
);

export default apiClient;
