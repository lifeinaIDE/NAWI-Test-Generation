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
  id?: string;
  userId?: string;
  username: string;
  displayName?: string;
  role: Role;
  active?: boolean;
  laboratory?: string;
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
  observedError?: number | null;
  correctedError?: number | null;
  maxPermissibleError?: number | null;
  mpe?: number | null;
  mpeInE?: number | null;
  result: "PASS" | "FAIL" | "WARNING" | "INCOMPLETE" | "NOT_APPLICABLE";
  formulaUsed?: string;
  ruleSetVersion?: string;
  criterion?: string | null;
  failureReason?: string | null;
  messages?: string[];
  details?: Record<string, unknown>;
}

export interface TestDefinition {
  testCode: string;
  testName: string;
  applicable: boolean;
  status: "INCOMPLETE" | "COMPLETED" | "PLANNED" | "NOT_APPLICABLE";
  observations: any[];
  calculations?: CalculationResult | Record<string, unknown> | any;
  result?: string;
  remarks?: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export interface AuditEvent {
  eventId?: string;
  userId: string;
  role?: string;
  userRole?: string;
  action: string;
  reportId?: string;
  fromStatus?: string;
  toStatus?: string;
  comment?: string | null;
  timestamp: string;
  ruleSetVersion?: string | null;
  details?: Record<string, unknown>;
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
export interface Attachment {
  id: string;
  attachmentId?: string;
  filename: string;
  storedFilename?: string;
  type?: string;
  category?: string;
  size?: number;
  sizeBytes?: number;
  uploadedAt: string;
  expiryDate?: string | null;
}

export interface Report {
  reportId: string;
  title?: string;
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
  technicianId?: string;
  createdAt: string;
  updatedAt: string;
  laboratory: Laboratory;
  manufacturer: Manufacturer;
  instrument: Instrument;
  environment: Environment;
  tests: TestDefinition[];
  attachments: Attachment[];
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
export interface MpeBand {
  minIntervals: number;
  maxIntervals: number;
  mpeInE: number;
  requiresDomainValidation?: boolean;
}

export interface RuleSet {
  ruleSetId: string;
  standard: string;
  edition: string;
  effectiveFrom: string;
  changeNotes?: string;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED" | string;
  createdBy?: string;
  createdAt?: string;
  warningRatio?: number;
  mpeRules: Record<string, MpeBand[] | any>;
  testRules: Record<string, any>;
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
  queryRaised: number;
  approved: number;
  rejected: number;
}

export interface DashboardStatistics {
  passRate: number;
  failRate: number;
  reportsByModel: Array<{ name?: string; model?: string; count: number }>;
  recentActivity: Array<any>;
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
