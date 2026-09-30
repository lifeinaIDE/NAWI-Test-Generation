/**
 * Centralised API client — NAWI Test Report Management System
 *
 * Error-handling convention (10_API_CONTRACT.md):
 *   - Backend always returns { "detail": ValidationMessage[] } for 4xx errors.
 *   - This interceptor converts those into thrown ApiError instances.
 *   - Callers can catch ApiError and read .messages to render inline field errors.
 *   - Non-field errors (no "field") are shown as toast notifications via react-hot-toast.
 *
 * Backend URL: http://localhost:8000
 */

import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import type {
  LoginRequest,
  LoginResponse,
  User,
  Report,
  CreateReportRequest,
  CalculationResult,
  RuleSet,
  DashboardSummary,
  DashboardStatistics,
  AuditEvent,
  ValidationMessage,
} from "../types";

// ---------------------------------------------------------------------------
// API Error class
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  messages: ValidationMessage[];
  statusCode: number;

  constructor(messages: ValidationMessage[], statusCode: number) {
    super(messages.map((m) => m.message).join("; "));
    this.messages = messages;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Axios instance — uses relative URLs proxied by Vite dev server to FastAPI
// ---------------------------------------------------------------------------
const BASE_URL = "";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from memory store on every request
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralised error interceptor
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail: ValidationMessage[] }>) => {
    if (!err.response) {
      // Network / server unreachable
      toast.error("Cannot reach local server. Mutating actions are disabled.");
      throw new ApiError(
        [{ level: "ERROR", field: "", message: "Cannot reach local server." }],
        0
      );
    }

    const status = err.response.status;
    const detail = err.response.data?.detail ?? [];

    // Build ApiError — callers render field-level errors inline
    const apiErr = new ApiError(detail, status);

    // Surface non-field errors as toasts
    const nonField = detail.filter((m) => !m.field);
    nonField.forEach((m) => {
      if (m.level === "ERROR") toast.error(m.message);
      else if (m.level === "WARNING") toast(m.message, { icon: "⚠️" });
    });

    if (status === 403) {
      toast.error("You don't have permission to perform this action.");
    }

    throw apiErr;
  }
);

// ---------------------------------------------------------------------------
// Token store — persists to localStorage so session survives page refresh
// ---------------------------------------------------------------------------
const TOKEN_KEY = "nawi_auth_token";

export const tokenStore = {
  set(t: string) { localStorage.setItem(TOKEN_KEY, t); },
  get() { return localStorage.getItem(TOKEN_KEY); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>("/api/auth/login", body);
    return res.data;
  },
  async me(): Promise<User> {
    const res = await api.get<User>("/api/auth/me");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const reportsApi = {
  async list(params?: Record<string, string>): Promise<{ items: Report[]; total: number }> {
    const res = await api.get("/api/reports", { params });
    return res.data;
  },
  async create(body: CreateReportRequest): Promise<Report> {
    const res = await api.post<Report>("/api/reports", body);
    return res.data;
  },
  async get(reportId: string): Promise<Report> {
    const res = await api.get<Report>(`/api/reports/${reportId}`);
    return res.data;
  },
  async update(reportId: string, body: Partial<Report>): Promise<Report> {
    const res = await api.put<Report>(`/api/reports/${reportId}`, body);
    return res.data;
  },
  async delete(reportId: string): Promise<void> {
    await api.delete(`/api/reports/${reportId}`);
  },
  async submit(reportId: string): Promise<Report> {
    const res = await api.post<Report>(`/api/reports/${reportId}/submit`);
    return res.data;
  },
  async returnReport(reportId: string, comment: string): Promise<Report> {
    const res = await api.post<Report>(`/api/reports/${reportId}/return`, { comment });
    return res.data;
  },
  async approve(reportId: string, comment: string): Promise<Report> {
    const res = await api.post<Report>(`/api/reports/${reportId}/approve`, { comment });
    return res.data;
  },
  async reject(reportId: string, comment: string): Promise<Report> {
    const res = await api.post<Report>(`/api/reports/${reportId}/reject`, { comment });
    return res.data;
  },
  async finalize(reportId: string): Promise<void> {
    await api.post(`/api/reports/${reportId}/finalize`);
  },
  async getDownloadUrl(reportId: string): Promise<string> {
    return `/api/reports/${reportId}/download`;
  },
  async getAudit(reportId: string): Promise<AuditEvent[]> {
    const res = await api.get<{ events: AuditEvent[] }>(`/api/reports/${reportId}/audit`);
    return res.data.events;
  },
};

// ---------------------------------------------------------------------------
// Calculations (stateless — live preview in wizard Step 5)
// ---------------------------------------------------------------------------
export const calculationsApi = {
  async weighingPerformance(body: Record<string, unknown>): Promise<CalculationResult> {
    const res = await api.post<CalculationResult>("/api/calculations/weighing-performance", body);
    return res.data;
  },
  async eccentricity(body: Record<string, unknown>): Promise<CalculationResult> {
    const res = await api.post<CalculationResult>("/api/calculations/eccentricity", body);
    return res.data;
  },
  async repeatability(body: Record<string, unknown>): Promise<CalculationResult> {
    const res = await api.post<CalculationResult>("/api/calculations/repeatability", body);
    return res.data;
  },
  async discrimination(body: Record<string, unknown>): Promise<CalculationResult> {
    const res = await api.post<CalculationResult>("/api/calculations/discrimination", body);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
export const rulesApi = {
  async list(): Promise<RuleSet[]> {
    const res = await api.get<RuleSet[]>("/api/rules");
    return res.data;
  },
  async getActive(): Promise<RuleSet> {
    const res = await api.get<RuleSet>("/api/rules/active");
    return res.data;
  },
  async get(id: string): Promise<RuleSet> {
    const res = await api.get<RuleSet>(`/api/rules/${id}`);
    return res.data;
  },
  async create(): Promise<RuleSet> {
    const res = await api.post<RuleSet>("/api/rules");
    return res.data;
  },
  async update(id: string, body: Partial<RuleSet>): Promise<RuleSet> {
    const res = await api.put<RuleSet>(`/api/rules/${id}`, body);
    return res.data;
  },
  async activate(id: string): Promise<RuleSet> {
    const res = await api.post<RuleSet>(`/api/rules/${id}/activate`);
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await api.get<DashboardSummary>("/api/dashboard/summary");
    return res.data;
  },
  async getStatistics(): Promise<DashboardStatistics> {
    const res = await api.get<DashboardStatistics>("/api/dashboard/statistics");
    return res.data;
  },
};

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export const auditApi = {
  async getAll(): Promise<AuditEvent[]> {
    const res = await api.get<{ events: AuditEvent[] }>("/api/audit");
    return res.data.events;
  },
};
