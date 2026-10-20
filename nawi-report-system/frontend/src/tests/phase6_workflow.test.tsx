import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ReviewQueuePage from "../pages/ReviewQueuePage";
import ReviewPage from "../pages/ReviewPage";
import WizardShell from "../pages/WizardShell";
import type { Report } from "../types";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
  ReferenceLine: ({ label }: any) => <div>{label?.value || "RefLine"}</div>,
  CartesianGrid: () => <div>Grid</div>,
}));

// Mock API
vi.mock("../api", () => ({
  reportsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    validate: vi.fn(),
    submit: vi.fn(),
    returnReport: vi.fn(),
    return: vi.fn(),
    approveReport: vi.fn(),
    approve: vi.fn(),
    rejectReport: vi.fn(),
    reject: vi.fn(),
    getAudit: vi.fn(),
    getAuditTrail: vi.fn(),
  },
  attachmentsApi: {
    list: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getDownloadUrl: vi.fn((reportId, attId) => `/api/reports/${reportId}/attachments/${attId}/download`),
  },
  auditApi: {
    listReportEvents: vi.fn(),
    listAllEvents: vi.fn(),
  },
  calculationsApi: {
    weighingPerformance: vi.fn(),
    eccentricity: vi.fn(),
    repeatability: vi.fn(),
    discrimination: vi.fn(),
  },
}));

import { reportsApi } from "../api";
import toast from "react-hot-toast";

describe("Phase 6: ReviewQueuePage", () => {
  const mockSubmittedReports: Report[] = [
    {
      reportId: "NAWI-2026-0001",
      applicationNumber: "APP-001",
      status: "SUBMITTED_FOR_REVIEW",
      reportVersion: 1,
      ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
      createdBy: "technician",
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T10:30:00Z",
      instrument: {
        model: "Precision-Scale-A",
        serialNumber: "SN-001",
        type: "ELECTRONIC",
        accuracyClass: "III",
        maxCapacity: 3000,
        minCapacity: 20,
        verificationIntervalE: 1,
        actualIntervalD: 1,
        numberOfIntervalsN: 3000,
        unit: "g",
        softwareVersion: "1.0",
        loadCell: {},
      },
      laboratory: { name: "Metrology Lab", address: "", location: "", contact: "" },
      manufacturer: { name: "Ohaus", address: "", country: "" },
      environment: { temperatureStart: 20, temperatureEnd: 22, relativeHumidity: 50, barometricPressure: 1013 },
      tests: [],
      attachments: [],
      review: { reviewerId: null, reviewerComments: "", reviewedAt: null },
      finalResult: "PENDING",
      hash: null,
      auditEvents: [],
    },
    {
      reportId: "NAWI-2026-0002",
      applicationNumber: "APP-002",
      status: "SUBMITTED_FOR_REVIEW",
      reportVersion: 1,
      ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
      createdBy: "technician-2",
      createdAt: "2026-01-02T10:00:00Z",
      updatedAt: "2026-01-02T11:00:00Z",
      instrument: {
        model: "Industrial-Scale-B",
        serialNumber: "SN-002",
        type: "ELECTRONIC",
        accuracyClass: "II",
        maxCapacity: 10000,
        minCapacity: 100,
        verificationIntervalE: 2,
        actualIntervalD: 1,
        numberOfIntervalsN: 5000,
        unit: "kg",
        softwareVersion: "2.0",
        loadCell: {},
      },
      laboratory: { name: "Metrology Lab", address: "", location: "", contact: "" },
      manufacturer: { name: "Mettler", address: "", country: "" },
      environment: { temperatureStart: 20, temperatureEnd: 22, relativeHumidity: 50, barometricPressure: 1013 },
      tests: [],
      attachments: [],
      review: { reviewerId: null, reviewerComments: "", reviewedAt: null },
      finalResult: "PENDING",
      hash: null,
      auditEvents: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders table of SUBMITTED_FOR_REVIEW reports with sorting and search filter", async () => {
    vi.mocked(reportsApi.list).mockResolvedValueOnce({
      items: mockSubmittedReports,
      total: 2,
      page: 1,
      pageSize: 10,
    });

    render(
      <MemoryRouter>
        <ReviewQueuePage />
      </MemoryRouter>
    );

    // Header & Queue Count
    await waitFor(() => {
      expect(screen.getByText("Reviewer Queue")).toBeInTheDocument();
      expect(screen.getByText("NAWI-2026-0001")).toBeInTheDocument();
      expect(screen.getByText("NAWI-2026-0002")).toBeInTheDocument();
    });

    expect(screen.getByText("Precision-Scale-A")).toBeInTheDocument();
    expect(screen.getByText("Industrial-Scale-B")).toBeInTheDocument();

    // Test Search Filter
    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "Industrial" } });

    expect(screen.queryByText("Precision-Scale-A")).not.toBeInTheDocument();
    expect(screen.getByText("Industrial-Scale-B")).toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("Precision-Scale-A")).toBeInTheDocument();
  });
});

describe("Phase 6: ReviewPage (3-Column View, Locked Rule-Set, Actions & Confirmation)", () => {
  const mockReviewReport: Report = {
    reportId: "NAWI-2026-0088",
    applicationNumber: "APP-SIH-88",
    status: "SUBMITTED_FOR_REVIEW",
    reportVersion: 1,
    ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
    createdBy: "technician",
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T12:00:00Z",
    instrument: {
      model: "XP-5000",
      serialNumber: "SN-999",
      type: "ELECTRONIC",
      accuracyClass: "III",
      maxCapacity: 5000,
      minCapacity: 40,
      verificationIntervalE: 1,
      actualIntervalD: 0.1,
      numberOfIntervalsN: 5000,
      unit: "g",
      softwareVersion: "1.0",
      loadCell: {},
    },
    laboratory: { name: "National Legal Metrology Lab", address: "", location: "", contact: "" },
    manufacturer: { name: "Avery Weigh-Tronix", address: "", country: "" },
    environment: { temperatureStart: 21.0, temperatureEnd: 21.5, relativeHumidity: 52.0, barometricPressure: 1012 },
    tests: [
      {
        testCode: "WEIGHING_PERFORMANCE",
        testName: "Weighing Performance",
        applicable: true,
        status: "COMPLETED",
        result: "PASS",
        observations: [],
        calculations: { result: "PASS", criterion: "abs(err) <= 0.5", observedError: 0.2, mpe: 0.5 },
      },
      {
        testCode: "ECCENTRICITY",
        testName: "Eccentricity",
        applicable: true,
        status: "COMPLETED",
        result: "FAIL",
        observations: [],
        calculations: {
          result: "FAIL",
          criterion: "abs(err) <= 0.5",
          observedError: 1.2,
          mpe: 0.5,
          failureReason: "Maximum error at REAR_LEFT (1.2) exceeds MPE 0.5",
        },
      },
    ],
    attachments: [
      {
        id: "att-1",
        filename: "cal_certificate.pdf",
        type: "application/pdf",
        category: "calibration_certificate",
        size: 102400,
        uploadedAt: "2026-01-01T10:00:00Z",
        expiryDate: "2027-01-01",
      },
    ],
    review: { reviewerId: null, reviewerComments: "", reviewedAt: null },
    finalResult: "PENDING",
    hash: null,
    auditEvents: [],
  };

  const mockAuditEvents = [
    {
      eventId: "ev-1",
      userId: "technician",
      role: "TECHNICIAN",
      action: "SUBMIT",
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED_FOR_REVIEW",
      timestamp: "2026-01-01T12:00:00Z",
      comment: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders read-only 3-column view, locked ruleset label, and audit timeline", async () => {
    vi.mocked(reportsApi.get).mockImplementation(async () => mockReviewReport);
    vi.mocked(reportsApi.getAudit).mockImplementation(async () => mockAuditEvents as any);

    render(
      <MemoryRouter initialEntries={["/review/NAWI-2026-0088"]}>
        <Routes>
          <Route path="/review/:id" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Locked rule-set label
    await waitFor(() => {
      expect(screen.getByTestId("locked-ruleset-banner")).toBeInTheDocument();
      expect(screen.getByTestId("frozen-ruleset-label")).toHaveTextContent("OIML-R76-PROTOTYPE-V1");
    });

    // Column 1: Details
    expect(screen.getByText("Report & Jurisdiction")).toBeInTheDocument();
    expect(screen.getByText("Instrument Parameters")).toBeInTheDocument();
    expect(screen.getByText("XP-5000 (SN-999)")).toBeInTheDocument();
    expect(screen.getByText("Class III")).toBeInTheDocument();

    // Column 2: Tests with result badges and failure reason
    expect(screen.getByText("Weighing Performance")).toBeInTheDocument();
    expect(screen.getByTestId("badge-WEIGHING_PERFORMANCE")).toHaveTextContent("PASS");

    expect(screen.getByText("Eccentricity")).toBeInTheDocument();
    expect(screen.getByTestId("badge-ECCENTRICITY")).toHaveTextContent("FAIL");
    expect(screen.getByTestId("failure-reason-ECCENTRICITY")).toHaveTextContent(
      "Maximum error at REAR_LEFT (1.2) exceeds MPE 0.5"
    );

    // Column 3: Attachments & Audit timeline
    expect(screen.getByText("cal_certificate.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("audit-timeline")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("SUBMIT")).toBeInTheDocument();
    });
  });

  it("requires comment before Return / Reject / Approve and shows modal confirmation", async () => {
    vi.mocked(reportsApi.get).mockImplementation(async () => mockReviewReport);
    vi.mocked(reportsApi.getAudit).mockImplementation(async () => mockAuditEvents as any);
    vi.mocked(reportsApi.returnReport).mockResolvedValueOnce({
      ...mockReviewReport,
      status: "QUERY_RAISED",
    });

    render(
      <MemoryRouter initialEntries={["/review/NAWI-2026-0088"]}>
        <Routes>
          <Route path="/review/:id" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("return-btn")).toBeInTheDocument();
    });

    // 1. Click Return with empty comment -> rejected by client validation with toast
    fireEvent.click(screen.getByTestId("return-btn"));
    expect(toast.error).toHaveBeenCalledWith("A review comment is required before proceeding.");

    // 2. Type comment
    const commentInput = screen.getByTestId("reviewer-comment-input");
    fireEvent.change(commentInput, { target: { value: "Eccentricity rear left exceeds threshold, please recalibrate." } });

    // 3. Click Return -> confirmation modal opens
    fireEvent.click(screen.getByTestId("return-btn"));
    expect(screen.getByText("Confirm Return for Correction")).toBeInTheDocument();

    // 4. Confirm in modal
    const confirmBtn = screen.getByRole("button", { name: "Confirm Return" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(reportsApi.returnReport).toHaveBeenCalledWith(
        "NAWI-2026-0088",
        "Eccentricity rear left exceeds threshold, please recalibrate."
      );
    });
  });
});

describe("Phase 6: Technician Flow in WizardShell", () => {
  const queryRaisedReport: Report = {
    reportId: "NAWI-2026-0099",
    applicationNumber: "APP-0099",
    status: "QUERY_RAISED",
    reportVersion: 1,
    ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
    createdBy: "technician",
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T12:00:00Z",
    instrument: {
      model: "Scale-QR",
      serialNumber: "SN-QR",
      type: "ELECTRONIC",
      accuracyClass: "III",
      maxCapacity: 5000,
      minCapacity: 40,
      verificationIntervalE: 1,
      actualIntervalD: 1,
      numberOfIntervalsN: 5000,
      unit: "g",
      softwareVersion: "1.0",
      loadCell: {},
    },
    laboratory: { name: "Lab", address: "", location: "", contact: "" },
    manufacturer: { name: "Mfg", address: "", country: "" },
    environment: { temperatureStart: 20, temperatureEnd: 22, relativeHumidity: 50, barometricPressure: 1013 },
    tests: [],
    attachments: [],
    review: {
      reviewerId: "user-rev-01",
      reviewerComments: "Recheck the zero error value and retest repeatability.",
      reviewedAt: "2026-01-01T12:00:00Z",
    },
    finalResult: "PENDING",
    hash: null,
    auditEvents: [],
  };

  const submittedReport: Report = {
    ...queryRaisedReport,
    reportId: "NAWI-2026-0099",
    status: "SUBMITTED_FOR_REVIEW",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays amber reviewer query card with comments and Resubmit button when QUERY_RAISED", async () => {
    vi.mocked(reportsApi.get).mockImplementation(async (id: string) => queryRaisedReport);
    vi.mocked(reportsApi.submit).mockResolvedValueOnce({
      ...queryRaisedReport,
      status: "SUBMITTED_FOR_REVIEW",
    });

    render(
      <MemoryRouter initialEntries={["/reports/NAWI-2026-0099"]}>
        <Routes>
          <Route path="/reports/:id" element={<WizardShell />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("reviewer-query-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Reviewer Correction Query Raised")).toBeInTheDocument();
    expect(
      screen.getByText(/"Recheck the zero error value and retest repeatability."/i)
    ).toBeInTheDocument();

    // Click Resubmit
    const resubmitBtn = screen.getByTestId("resubmit-btn");
    expect(resubmitBtn).toBeInTheDocument();
    fireEvent.click(resubmitBtn);

    await waitFor(() => {
      expect(reportsApi.submit).toHaveBeenCalledWith("NAWI-2026-0099");
    });
  });

  it("displays read-only status banner and disables draft saving when SUBMITTED_FOR_REVIEW", async () => {
    vi.mocked(reportsApi.get).mockImplementation(async (id: string) => submittedReport);

    render(
      <MemoryRouter initialEntries={["/reports/NAWI-2026-0099"]}>
        <Routes>
          <Route path="/reports/:id" element={<WizardShell />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("readonly-status-banner")).toBeInTheDocument();
    });

    expect(screen.getByText(/Report is currently SUBMITTED_FOR_REVIEW \(Read-Only\)/i)).toBeInTheDocument();

    // Save Draft button is disabled
    const saveDraftBtn = screen.getByRole("button", { name: /Save Draft/i });
    expect(saveDraftBtn).toBeDisabled();
  });
});
