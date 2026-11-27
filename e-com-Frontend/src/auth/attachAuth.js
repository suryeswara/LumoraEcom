import { getToken } from "./jwt";

const API_BASE = import.meta.env.VITE_BASE_URL || "http://localhost:8080";

// Adds "Authorization: Bearer <jwt>" to every request that goes to OUR backend (never to other hosts),
// and announces an expired/invalid session when the server answers 401 to an authenticated request.
export function attachAuth(instance) {
  instance.interceptors.request.use((config) => {
    const token = getToken();
    const url = config.url || "";
    const target = /^https?:\/\//.test(url) ? url : `${config.baseURL || ""}${url}`;
    if (token && target.startsWith(API_BASE)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const sentToken = Boolean(error.config?.headers?.Authorization);
      if (error.response?.status === 401 && sentToken) {
        window.dispatchEvent(new Event("auth:expired"));
      }
      return Promise.reject(error);
    }
  );
}
