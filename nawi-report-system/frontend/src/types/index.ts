/**
 * NAWI Test Report Management System — Shared TypeScript Types
 *
 * CRITICAL: Field names here MUST match backend/app/schemas/__init__.py exactly
 * (camelCase throughout). Any divergence causes silent data loss in forms.
 *
 * Source of truth: 09_DATA_MODEL.md
 */

// ---------------------------------------------------------------------------
// User / Auth
// ---------------------------------------------------------------------------
export type Role = "TECHNICIAN" | "REVIEWER" | "ADMIN" | "VIEWER";

export interface User {
  id: string;
  username: string;
  role: Role;
  laboratory: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Instrument / Lab / Environment
// ---------------------------------------------------------------------------
export interface Laboratory {
  name: string;
  address: string;
  location: string;
  contact: string;
}

export interface Manufacturer {
  name: string;
  address: string;
  country: string;
}

export interface Instrument {
  model: string;
  serialNumber: string;
  type: string;
  accuracyClass: string;      // "II" | "III" | "IIII"
  maxCapacity: number;
  minCapacity: number;
  verificationIntervalE: number;
  actualIntervalD: number;
  numberOfIntervalsN: number;
  unit: string;               // "kg" | "g" | "t"
  softwareVersion: string;
  loadCell: Record<string, unknown>;
}

export interface Environment {
  temperatureStart: number;
  temperatureEnd: number;
  relativeHumidity: number;
  barometricPressure: number | null;
}

// ---------------------------------------------------------------------------
// Tests & Calculations
// ---------------------------------------------------------------------------
export interface TestObservation {
  key: string;
  value: unknown;
  unit: string;
}

export interface CalculationResult {
  observedError: number;
  correctedError?: number;
  maxPermissibleError: number;
  result: "PASS" | "FAIL" | "WARNING" | "INCOMPLETE" | "NOT_APPLICABLE";
  formulaUsed: string;
  ruleSetVersion: string;
  details: Record<string, unknown>;
}

export interface TestDefinition {
  testCode: string;
  testName: string;
  applicable: boolean;
  status: "INCOMPLETE" | "COMPLETED" | "PLANNED" | "NOT_APPLICABLE";
  observations: TestObservation[];
  calculations: Record<string, unknown>;
  result: string;
  remarks: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export interface AuditEvent {
  eventId: string;
  userId: string;
  userRole: string;
  action: string;
  reportId?: string;
  fromStatus?: string;
  toStatus?: string;
  comment?: string;
  timestamp: string;
  ruleSetVersion?: string;
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------
export interface ReviewInfo {
  reviewerId: string | null;
  reviewerComments: string;
  reviewedAt: string | null;
}

// ---------------------------------------------------------------------------
// Report (core entity — 09_DATA_MODEL.md)
// ---------------------------------------------------------------------------
export interface Report {
  reportId: string;
  applicationNumber: string;
  status:
    | "DRAFT"
    | "IN_PROGRESS"
    | "SUBMITTED_FOR_REVIEW"
    | "QUERY_RAISED"
    | "APPROVED"
    | "REJECTED"
    | "ARCHIVED";
  reportVersion: number;
  ruleSetVersion: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  laboratory: Laboratory;
  manufacturer: Manufacturer;
  instrument: Instrument;
  environment: Environment;
  tests: TestDefinition[];
  attachments: unknown[];
  review: ReviewInfo;
  finalResult: "PASS" | "FAIL" | "WARNING" | "PENDING";
  hash: string | null;
  auditEvents: string[];
}

export interface CreateReportRequest {
  instrument: Partial<Instrument>;
  manufacturer: Partial<Manufacturer>;
  laboratory: Partial<Laboratory>;
}

// ---------------------------------------------------------------------------
// Rule-Set (11_RULE_ENGINE_SPEC.md)
// ---------------------------------------------------------------------------
export interface RuleSet {
  ruleSetId: string;
  standard: string;
  edition: string;
  effectiveFrom: string;
  changeNotes: string;
  mpeRules: Record<string, unknown>;
  testRules: Record<string, unknown>;
  isActive: boolean;
  isLocked: boolean;
}

// ---------------------------------------------------------------------------
// Dashboard (08_DATA_MODEL.md)
// ---------------------------------------------------------------------------
export interface DashboardSummary {
  total: number;
  drafts: number;
  inProgress: number;
  submittedForReview: number;
  approved: number;
  rejected: number;
}

export interface DashboardStatistics {
  passRate: number;
  failRate: number;
  reportsByModel: Array<{ model: string; count: number }>;
  recentActivity: Array<{ reportId: string; action: string; timestamp: string; user: string }>;
}

// ---------------------------------------------------------------------------
// Validation (10_API_CONTRACT.md error convention)
// ---------------------------------------------------------------------------
export interface ValidationMessage {
  level: "ERROR" | "WARNING" | "INFO";
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  detail: ValidationMessage[];
}
