import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      resolve(api(config));
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Only /api/auth/me benefits from the refresh-and-retry flow (expired
    // access token on a still-valid session). Every other /api/auth/* endpoint
    // returns 401 to mean "bad credentials/input", not "token expired" — so
    // retrying would loop (login 401 → refresh 200 → login 401 → ...) and
    // hammer the rate limit on a single user submission.
    const url = originalRequest.url ?? "";
    const isNonRefreshableAuth =
      url.startsWith("/api/auth/") && !url.endsWith("/api/auth/me");

    if (error.response?.status !== 401 || isNonRefreshableAuth) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    isRefreshing = true;

    try {
      await api.post("/api/auth/refresh");
      processQueue(null);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      window.dispatchEvent(new CustomEvent("auth:expired"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
