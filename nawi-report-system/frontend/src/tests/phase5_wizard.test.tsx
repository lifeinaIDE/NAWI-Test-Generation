import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";

import Step4TestSelection from "../wizard/Step4TestSelection";
import Step5TestDataEntry from "../wizard/Step5TestDataEntry";
import Step6Attachments from "../wizard/Step6Attachments";
import Step7ReviewAndSubmit from "../wizard/Step7ReviewAndSubmit";
import PassFailIndicator from "../components/PassFailIndicator";
import PlatformMap from "../components/PlatformMap";
import RepeatabilityChart from "../components/RepeatabilityChart";
import { D2, D3 } from "../constants/disclaimers";
import type { Report, CalculationResult } from "../types";

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

// Mock calculations and reports API
vi.mock("../api", () => ({
  calculationsApi: {
    weighingPerformance: vi.fn(),
    eccentricity: vi.fn(),
    repeatability: vi.fn(),
    discrimination: vi.fn(),
  },
  reportsApi: {
    validate: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  attachmentsApi: {
    list: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

import { calculationsApi, reportsApi, attachmentsApi } from "../api";

describe("Phase 5: Step 4 Test Selection", () => {
  const mockReport: Report = {
    reportId: "NAWI-2026-0001",
    applicationNumber: "APP-001",
    status: "DRAFT",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    tests: [
      {
        testCode: "WEIGHING_PERFORMANCE",
        testName: "Weighing Performance",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
      {
        testCode: "ECCENTRICITY",
        testName: "Eccentricity",
        applicable: false,
        status: "NOT_APPLICABLE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
      {
        testCode: "REPEATABILITY",
        testName: "Repeatability",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
      {
        testCode: "DISCRIMINATION",
        testName: "Discrimination",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
    ],
  } as any as Report;

  it("renders 4 implemented tests with toggles and 13 planned tests with D2", () => {
    render(
      <Step4TestSelection
        report={mockReport}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );

    // 4 Implemented tests
    expect(screen.getByText("Weighing Performance")).toBeInTheDocument();
    expect(screen.getByText("Eccentricity")).toBeInTheDocument();
    expect(screen.getByText("Repeatability")).toBeInTheDocument();
    expect(screen.getByText("Discrimination")).toBeInTheDocument();

    // Not-applicable shows INFO banner
    expect(
      screen.getByText("This test has not been marked applicable.")
    ).toBeInTheDocument();

    // 13 Planned tests with D2 label
    const plannedBadges = screen.getAllByTestId("d2-label");
    expect(plannedBadges.length).toBe(13);

    // Check specific planned tests exist
    expect(screen.getByText("Zero Return")).toBeInTheDocument();
    expect(screen.getByText("Creep")).toBeInTheDocument();
    expect(screen.getByText("Temperature Effect")).toBeInTheDocument();
    expect(screen.getByText("Endurance")).toBeInTheDocument();
    expect(screen.getByText("Construction Examination")).toBeInTheDocument();
  });
});

describe("Phase 5: Step 5 Test Data Entry & Calculations", () => {
  const baseReport: Report = {
    reportId: "NAWI-2026-0001",
    applicationNumber: "APP-001",
    status: "DRAFT",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    instrument: {
      model: "XP-2000",
      serialNumber: "SN-987",
      type: "ELECTRONIC",
      accuracyClass: "III",
      maxCapacity: 5000,
      minCapacity: 20,
      verificationIntervalE: 1,
      actualIntervalD: 0.1,
      numberOfIntervalsN: 5000,
      unit: "g",
      softwareVersion: "1.0",
      loadCell: {},
    },
    tests: [
      {
        testCode: "WEIGHING_PERFORMANCE",
        testName: "Weighing Performance",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
      {
        testCode: "ECCENTRICITY",
        testName: "Eccentricity",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
      {
        testCode: "REPEATABILITY",
        testName: "Repeatability",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
      {
        testCode: "DISCRIMINATION",
        testName: "Discrimination",
        applicable: true,
        status: "INCOMPLETE",
        observations: [],
        calculations: {},
        result: "",
        remarks: "",
      },
    ],
  } as any as Report;

  it("renders tabs with status dots and Weighing Performance fields", () => {
    render(
      <Step5TestDataEntry
        report={baseReport}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );

    // Verify tabs
    expect(screen.getByRole("tab", { name: /Weighing Performance/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Eccentricity/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Repeatability/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Discrimination/i })).toBeInTheDocument();

    // Verify Weighing Performance fields
    expect(screen.getByTestId("input-testLoad")).toBeInTheDocument();
    expect(screen.getByTestId("input-indication")).toBeInTheDocument();
    expect(screen.getByTestId("input-zeroError")).toBeInTheDocument();

    // Verify auto-filled metadata and formula note
    expect(screen.getByText("Observed Error = Indication - Test Load")).toBeInTheDocument();
    expect(screen.getByText(/Class:/i)).toBeInTheDocument();
  });

  it("renders Eccentricity with 5 position rows and PlatformMap", () => {
    render(
      <Step5TestDataEntry
        report={baseReport}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );

    // Click Eccentricity Tab
    fireEvent.click(screen.getByRole("tab", { name: /Eccentricity/i }));

    // 5 positions
    const positions = ["CENTER", "FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"];
    positions.forEach((pos) => {
      expect(screen.getByTestId(`ecc-load-${pos}`)).toBeInTheDocument();
      expect(screen.getByTestId(`ecc-ref-${pos}`)).toBeInTheDocument();
      expect(screen.getByTestId(`ecc-ind-${pos}`)).toBeInTheDocument();
    });

    // Platform Topography
    expect(screen.getByText("Platform Topography")).toBeInTheDocument();
  });

  it("renders Repeatability with testLoad, repetitions selector, and readings", () => {
    render(
      <Step5TestDataEntry
        report={baseReport}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );

    // Click Repeatability Tab
    fireEvent.click(screen.getByRole("tab", { name: /Repeatability/i }));

    expect(screen.getByTestId("input-repeatability-load")).toBeInTheDocument();
    expect(screen.getByTestId("select-repeatability-reps")).toBeInTheDocument();
    // Default 10 repetitions
    expect(screen.getByTestId("rep-reading-1")).toBeInTheDocument();
    expect(screen.getByTestId("rep-reading-10")).toBeInTheDocument();
  });

  it("renders Discrimination with initialIndication, addedLoad, newIndication, and auto-filled d", () => {
    render(
      <Step5TestDataEntry
        report={baseReport}
        onSave={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );

    // Click Discrimination Tab
    fireEvent.click(screen.getByRole("tab", { name: /Discrimination/i }));

    expect(screen.getByTestId("input-initialIndication")).toBeInTheDocument();
    expect(screen.getByTestId("input-addedLoad")).toBeInTheDocument();
    expect(screen.getByTestId("input-newIndication")).toBeInTheDocument();
    expect(screen.getByText(/auto-filled/i)).toHaveTextContent("d = 0.1 (auto-filled)");
  });
});

describe("Phase 5: PassFailIndicator displays ONLY server fields", () => {
  it("renders backend PASS result, criterion, server tag, ruleset ID, and D3 beside MPE", () => {
    const mockResult: CalculationResult = {
      result: "PASS",
      observedError: 0.25,
      maxPermissibleError: 0.5,
      mpe: 0.5,
      formulaUsed: "OBSERVED_ERROR_V1",
      ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
      criterion: "abs(observedError) <= 0.5",
      messages: [],
    };

    render(<PassFailIndicator result={mockResult} />);

    // Verification of server fields
    expect(screen.getByTestId("pass-fail-badge")).toHaveTextContent("PASS");
    expect(screen.getByTestId("server-tag")).toHaveTextContent("Calculated by server");
    expect(screen.getByTestId("ruleset-tag")).toHaveTextContent("OIML-R76-PROTOTYPE-V1");
    expect(screen.getByTestId("mpe-tag")).toHaveTextContent("MPE: ±0.5");
    expect(screen.getByTestId("d3-tag")).toHaveTextContent("D3");
    expect(screen.getByTestId("criterion-text")).toHaveTextContent("abs(observedError) <= 0.5");
  });

  it("renders backend FAIL result and failureReason without frontend math", () => {
    const mockResult: CalculationResult = {
      result: "FAIL",
      observedError: 1.25,
      maxPermissibleError: 0.5,
      mpe: 0.5,
      ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
      criterion: "abs(observedError) <= 0.5",
      failureReason: "Observed error 1.25 exceeds MPE 0.5",
      messages: ["Observed error 1.25 exceeds MPE 0.5"],
    };

    render(<PassFailIndicator result={mockResult} />);

    expect(screen.getByTestId("pass-fail-badge")).toHaveTextContent("FAIL");
    expect(screen.getByTestId("failure-reason-box")).toHaveTextContent(
      "Observed error 1.25 exceeds MPE 0.5"
    );
  });
});

describe("Phase 5: Step 6 Attachments", () => {
  const reportWithAttachments: Report = {
    reportId: "NAWI-2026-0001",
    applicationNumber: "APP-001",
    status: "DRAFT",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    attachments: [
      {
        id: "att-1",
        filename: "cal_cert_2020.pdf",
        type: "application/pdf",
        category: "calibration_certificate",
        size: 204800,
        uploadedAt: "2026-01-01T00:00:00Z",
        expiryDate: "2020-01-01", // EXPIRED
      },
      {
        id: "att-2",
        filename: "scale_photo.png",
        type: "image/png",
        category: "photos",
        size: 512000,
        uploadedAt: "2026-01-01T00:00:00Z",
      },
    ],
  } as any as Report;

  it("renders 3 upload zones, type/size hints, and expired-certificate ERROR banner", () => {
    render(<Step6Attachments report={reportWithAttachments} />);

    // 3 Upload zones
    expect(screen.getByTestId("upload-zone-photos")).toBeInTheDocument();
    expect(screen.getByTestId("upload-zone-calibration_certificate")).toBeInTheDocument();
    expect(screen.getByTestId("upload-zone-manufacturer_documentation")).toBeInTheDocument();

    // Hints
    expect(screen.getAllByText(/Max 10 MB/i).length).toBeGreaterThanOrEqual(3);

    // Expired certificate banner
    expect(screen.getByTestId("expired-cert-banner")).toBeInTheDocument();
    expect(screen.getByText(/Calibration Certificate Must Not Be Expired \(ERROR\)/i)).toBeInTheDocument();
  });
});

describe("Phase 5: Step 7 Review & Submit", () => {
  const validReport: Report = {
    reportId: "NAWI-2026-0001",
    applicationNumber: "APP-001",
    status: "DRAFT",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    instrument: {
      model: "XP-2000",
      serialNumber: "SN-987",
      type: "ELECTRONIC",
      accuracyClass: "III",
      maxCapacity: 5000,
      minCapacity: 20,
      verificationIntervalE: 1,
      actualIntervalD: 0.1,
      numberOfIntervalsN: 5000,
      unit: "g",
      softwareVersion: "1.0",
      loadCell: {},
    },
    tests: [
      {
        testCode: "WEIGHING_PERFORMANCE",
        testName: "Weighing Performance",
        applicable: true,
        status: "COMPLETED",
        observations: [],
        calculations: { result: "PASS", criterion: "abs(err) <= 0.5", observedError: 0.2 },
        result: "PASS",
        remarks: "",
      },
    ],
  } as any as Report;

  it("disables Submit for Review while ERRORs exist or declaration box unchecked", async () => {
    vi.mocked(reportsApi.validate).mockResolvedValueOnce({
      reportId: "NAWI-2026-0001",
      valid: false,
      messages: [
        {
          level: "ERROR",
          field: "attachments.calibration_certificate",
          message: "Calibration certificate must not be expired.",
        },
      ],
    });

    const onNavigateStep = vi.fn();

    render(
      <Step7ReviewAndSubmit
        report={validReport}
        onPrev={vi.fn()}
        onNavigateStep={onNavigateStep}
      />
    );

    // Wait for validation to render
    await waitFor(() => {
      expect(screen.getByTestId("validation-error-item")).toBeInTheDocument();
    });

    expect(screen.getByText("Calibration certificate must not be expired.")).toBeInTheDocument();

    // Check "go to field" link
    const gotoLink = screen.getByTestId("goto-field-link");
    expect(gotoLink).toBeInTheDocument();
    fireEvent.click(gotoLink);
    expect(onNavigateStep).toHaveBeenCalledWith(6); // Step 6 Attachments

    // Submit button should be disabled due to ERROR
    const submitBtn = screen.getByTestId("submit-for-review-btn");
    expect(submitBtn).toBeDisabled();

    // Check declaration checkbox
    const checkbox = screen.getByTestId("declaration-checkbox");
    fireEvent.click(checkbox);
    // Still disabled because blocking ERROR exists
    expect(submitBtn).toBeDisabled();
  });
});
