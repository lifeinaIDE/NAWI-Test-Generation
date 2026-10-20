import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import type { ValidationMessage } from "../types";

// ---------------------------------------------------------------------------
// In-memory token store (no localStorage per Phase 2 specification)
// ---------------------------------------------------------------------------
let inMemoryToken: string | null = null;

export const tokenStore = {
  get: (): string | null => inMemoryToken,
  set: (token: string): void => {
    inMemoryToken = token;
  },
  clear: (): void => {
    inMemoryToken = null;
  },
};

// ---------------------------------------------------------------------------
// Global connection and authorization state
// ---------------------------------------------------------------------------
export const connectionState = {
  isBackendUnreachable: false,
  listeners: new Set<(unreachable: boolean) => void>(),
  setUnreachable(val: boolean) {
    if (this.isBackendUnreachable !== val) {
      this.isBackendUnreachable = val;
      this.listeners.forEach((fn) => fn(val));
    }
  },
  subscribe(fn: (unreachable: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },
};

// ---------------------------------------------------------------------------
// Axios instance configured per Phase 1 specification
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ---------------------------------------------------------------------------
// Request interceptor: Inject Authorization header
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor:
// - Toast on errors
// - 401 -> redirect to /login
// - 403 -> redirect or navigate to /not-authorised
// - Network failure -> set global backend unreachable flag
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => {
    // If request succeeded, clear any previous unreachable state
    connectionState.setUnreachable(false);
    return response;
  },
  (error: AxiosError<any>) => {
    // Network failure or backend unreachable
    if (!error.response) {
      connectionState.setUnreachable(true);
      toast.error("Backend service is unreachable. Please check if the FastAPI server is running.");
      return Promise.reject(error);
    }

    connectionState.setUnreachable(false);
    const status = error.response.status;
    const data = error.response.data;

    // 401 Unauthorized -> clear token and redirect to login
    if (status === 401) {
      tokenStore.clear();
      toast.error("Session expired or unauthorized. Please sign in again.");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // 403 Forbidden -> not authorised state
    if (status === 403) {
      toast.error("You don't have permission to perform this action.");
      if (window.location.pathname !== "/not-authorised" && !window.location.pathname.startsWith("/login")) {
        // Optional redirect to /not-authorised for page level navigation
      }
      return Promise.reject(error);
    }

    // Extract validation error messages or general message
    const details = data?.detail;
    if (Array.isArray(details)) {
      const messages = details.map((m: ValidationMessage) => m.message).join("\n");
      toast.error(messages || "Validation error occurred.");
    } else if (typeof details === "string") {
      toast.error(details);
    } else if (data?.message) {
      toast.error(data.message);
    } else {
      toast.error(`Request failed with status code ${status}`);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
