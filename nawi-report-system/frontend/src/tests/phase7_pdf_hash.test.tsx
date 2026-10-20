import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ReportViewPage from "../pages/ReportViewPage";
import type { Report } from "../types";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
}));

// Mock API
vi.mock("../api", () => ({
  reportsApi: {
    get: vi.fn(),
    verify: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

import { reportsApi } from "../api";

const mockApprovedReport: Report = {
  reportId: "NAWI-2026-0001",
  applicationNumber: "APP-2026-999",
  status: "APPROVED",
  reportVersion: 1,
  ruleSetVersion: "OIML-R76-PROTOTYPE-V1",
  createdBy: "user-tech-01",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T12:00:00Z",
  laboratory: {
    name: "National Legal Metrology Lab",
    address: "Central Standards Complex",
    location: "Hub 1",
    contact: "metrology@gov.in",
  },
  manufacturer: {
    name: "Precision Balances Ltd",
    address: "Plot 42",
    country: "India",
  },
  instrument: {
    model: "PB-3000",
    serialNumber: "SN-98765",
    type: "ELECTRONIC",
    accuracyClass: "III",
    maxCapacity: 3000,
    minCapacity: 20,
    verificationIntervalE: 1,
    actualIntervalD: 1,
    numberOfIntervalsN: 3000,
    unit: "kg",
    softwareVersion: "2.1",
    loadCell: {},
  },
  environment: {
    temperatureStart: 21.0,
    temperatureEnd: 21.5,
    relativeHumidity: 52.0,
    barometricPressure: 1013.2,
  },
  tests: [
    {
      testCode: "WP",
      testName: "Weighing Performance",
      applicable: true,
      status: "COMPLETED",
      observations: [{ testLoad: 500, indication: 500.0, zeroError: 0.0 }],
      calculations: { observedError: 0.0, maxPermissibleError: 1.0 },
      result: "PASS",
      remarks: "Within tolerance",
    },
  ],
  attachments: [],
  review: {
    reviewerId: "reviewer-01",
    reviewerComments: "Fully compliant with OIML R-76.",
    reviewedAt: "2026-01-01T12:00:00Z",
  },
  finalResult: "PASS",
  hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  auditEvents: [],
};

describe("Phase 7: ReportViewPage, PDF, Hashing & Enforced Immutability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders A4-style preview with all key items, lock icon, status badge, and disclaimers", async () => {
    (reportsApi.get as any).mockResolvedValue(mockApprovedReport);

    render(
      <MemoryRouter initialEntries={["/reports/NAWI-2026-0001/view"]}>
        <Routes>
          <Route path="/reports/:id/view" element={<ReportViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Item 1: Report Title
      expect(
        screen.getByText(/NON-AUTOMATIC WEIGHING INSTRUMENT TEST REPORT/i)
      ).toBeInTheDocument();
      // Item 2: Report ID
      expect(screen.getAllByText("NAWI-2026-0001").length).toBeGreaterThan(0);
      // Item 6: Instrument Model
      expect(screen.getByText("PB-3000")).toBeInTheDocument();
      // Enforced immutability lock indicator
      expect(screen.getByText(/Enforced Immutability/i)).toBeInTheDocument();
      // Status badge
      expect(screen.getByText("Approved")).toBeInTheDocument();
      // D4 disclaimer under the hash
      expect(
        screen.getAllByText(/Prototype integrity hash — not a legally valid digital signature/i).length
      ).toBeGreaterThan(0);
      // D1 disclaimer in the footer
      expect(
        screen.getByText(/Preliminary automated evaluation based on the configured OIML R-76 rule-set/i)
      ).toBeInTheDocument();
    });
  });

  it("opens Verify modal displaying Match: true in green when cryptographic hash matches", async () => {
    (reportsApi.get as any).mockResolvedValue(mockApprovedReport);
    (reportsApi.verify as any).mockResolvedValue({
      match: true,
      storedHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      computedHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });

    render(
      <MemoryRouter initialEntries={["/reports/NAWI-2026-0001/view"]}>
        <Routes>
          <Route path="/reports/:id/view" element={<ReportViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Verify Integrity")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Verify Integrity"));

    await waitFor(() => {
      expect(screen.getByText("Match: true")).toBeInTheDocument();
      expect(screen.getByText("Match: true")).toHaveClass("text-base");
      expect(screen.getByText("Stored Hash:")).toBeInTheDocument();
      expect(screen.getByText("Computed Hash:")).toBeInTheDocument();
      expect(screen.getAllByText("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855").length).toBeGreaterThan(1);
    });
  });

  it("opens Verify modal displaying Match: false in red when hash mismatch occurs (tampering detected)", async () => {
    (reportsApi.get as any).mockResolvedValue(mockApprovedReport);
    (reportsApi.verify as any).mockResolvedValue({
      match: false,
      storedHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      computedHash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    });

    render(
      <MemoryRouter initialEntries={["/reports/NAWI-2026-0001/view"]}>
        <Routes>
          <Route path="/reports/:id/view" element={<ReportViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Verify Integrity")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Verify Integrity"));

    await waitFor(() => {
      expect(screen.getByText("Match: false")).toBeInTheDocument();
      expect(screen.getByText(/Tampering detected/i)).toBeInTheDocument();
      expect(screen.getByText("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")).toBeInTheDocument();
    });
  });

  it("handles Download PDF click", async () => {
    (reportsApi.get as any).mockResolvedValue(mockApprovedReport);
    const mockBlob = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    (reportsApi.downloadPdf as any).mockResolvedValue(mockBlob);

    // Mock window.URL methods
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/test");
    window.URL.revokeObjectURL = vi.fn();

    render(
      <MemoryRouter initialEntries={["/reports/NAWI-2026-0001/view"]}>
        <Routes>
          <Route path="/reports/:id/view" element={<ReportViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Download PDF")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Download PDF"));

    await waitFor(() => {
      expect(reportsApi.downloadPdf).toHaveBeenCalledWith("NAWI-2026-0001");
    });
  });
});
