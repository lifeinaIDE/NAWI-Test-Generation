import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import RepositoryPage from "../pages/RepositoryPage";
import DashboardPage from "../pages/DashboardPage";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div>Cell</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
}));

// Mock auth hook
const mockUser = {
  id: "user-01",
  username: "technician",
  role: "TECHNICIAN",
};
let currentUser = { ...mockUser };

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: currentUser,
  }),
}));

// Mock API
vi.mock("../api", () => ({
  reportsApi: {
    list: vi.fn(),
    downloadPdf: vi.fn(),
  },
  dashboardApi: {
    getSummary: vi.fn(),
    getStatistics: vi.fn(),
  },
  healthApi: {
    check: vi.fn(),
  },
  tokenStore: {
    get: vi.fn().mockReturnValue("mock-token"),
  },
}));

import { reportsApi, dashboardApi, healthApi } from "../api";

describe("Phase 8: Search, Filters & Dashboard Metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { ...mockUser };
  });

  describe("RepositoryPage", () => {
    it("renders search bar, all 8 filter controls, sortable table, and pagination", async () => {
      (reportsApi.list as any).mockResolvedValue({
        items: [
          {
            reportId: "NAWI-2026-0001",
            status: "APPROVED",
            instrument: { model: "XP-Compact", serialNumber: "SN-001", accuracyClass: "III" },
            manufacturer: { name: "Precision Ltd" },
            createdBy: "tech1",
            createdAt: "2026-03-01T10:00:00Z",
            finalResult: "PASS",
          },
          {
            reportId: "NAWI-2026-0002",
            status: "DRAFT",
            instrument: { model: "Delta-300", serialNumber: "SN-002", accuracyClass: "II" },
            manufacturer: { name: "Delta Scale" },
            createdBy: "tech1",
            createdAt: "2026-03-02T10:00:00Z",
            finalResult: "PENDING",
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      });

      render(
        <MemoryRouter>
          <RepositoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Search bar
        expect(
          screen.getByPlaceholderText(/Search by ID, model, serial number/i)
        ).toBeInTheDocument();

        // Filters
        expect(screen.getByText("All Statuses")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("e.g. XP-3000")).toBeInTheDocument(); // Model
        expect(screen.getByPlaceholderText("e.g. Mettler")).toBeInTheDocument(); // Manufacturer
        expect(screen.getByPlaceholderText("e.g. SN-100")).toBeInTheDocument(); // Serial
        expect(screen.getByText("All Classes")).toBeInTheDocument();
        expect(screen.getByText("All Results")).toBeInTheDocument();

        // Table items
        expect(screen.getByText("NAWI-2026-0001")).toBeInTheDocument();
        expect(screen.getByText("NAWI-2026-0002")).toBeInTheDocument();

        // Actions: View for all roles
        expect(screen.getAllByText("View").length).toBe(2);

        // Download PDF for APPROVED only
        expect(screen.getByText("PDF")).toBeInTheDocument();

        // Pagination
        expect(
          screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, " ").trim() === "Page 1 of 1")
        ).toBeInTheDocument();
      });
    });

    it("triggers search and sorting when query inputs change", async () => {
      (reportsApi.list as any).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      render(
        <MemoryRouter>
          <RepositoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(reportsApi.list).toHaveBeenCalled();
      });

      // Type in search bar
      const searchInput = screen.getByPlaceholderText(/Search by ID, model, serial number/i);
      fireEvent.change(searchInput, { target: { value: "XP-Compact" } });

      await waitFor(() => {
        expect(reportsApi.list).toHaveBeenCalledWith(
          expect.objectContaining({ q: "XP-Compact" })
        );
      });

      // Click column header to sort
      const modelHeader = screen.getByRole("columnheader", { name: /Model/i });
      fireEvent.click(modelHeader);

      await waitFor(() => {
        expect(reportsApi.list).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: "model" })
        );
      });
    });

    it("displays empty state with clear filters button when 0 records match", async () => {
      (reportsApi.list as any).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      render(
        <MemoryRouter>
          <RepositoryPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No reports match your search criteria/i)).toBeInTheDocument();
        expect(screen.getByText("Clear filters")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Clear filters"));
      await waitFor(() => {
        expect(reportsApi.list).toHaveBeenCalled();
      });
    });
  });

  describe("DashboardPage", () => {
    it("renders summary cards, donut chart, models bar chart, and recent activity", async () => {
      (dashboardApi.getSummary as any).mockResolvedValue({
        total: 12,
        drafts: 3,
        inProgress: 2,
        submittedForReview: 1,
        queryRaised: 1,
        approved: 4,
        rejected: 1,
      });

      (dashboardApi.getStatistics as any).mockResolvedValue({
        passRate: 75.0,
        failRate: 25.0,
        reportsByModel: [
          { name: "XP-3000", count: 8 },
          { name: "Delta-500", count: 4 },
        ],
        recentActivity: [
          {
            eventId: "evt-1",
            userId: "tech1",
            userRole: "TECHNICIAN",
            action: "SUBMIT",
            reportId: "NAWI-2026-0001",
            timestamp: "2026-03-01T10:00:00Z",
            comment: "Submitting for calibration check.",
          },
        ],
      });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Summary cards
        expect(screen.getByText("Total Reports")).toBeInTheDocument();
        expect(screen.getByText("Drafts")).toBeInTheDocument();
        expect(screen.getByText("In Progress")).toBeInTheDocument();
        expect(screen.getByText("Awaiting Review")).toBeInTheDocument();
        expect(screen.getByText("Query Raised")).toBeInTheDocument();
        expect(screen.getByText("Approved")).toBeInTheDocument();
        expect(screen.getByText("Rejected")).toBeInTheDocument();

        // Check values
        expect(screen.getByText("12")).toBeInTheDocument();

        // Recent activity
        expect(screen.getByText(/tech1/i)).toBeInTheDocument();
        expect(screen.getByText(/Submitting for calibration check/i)).toBeInTheDocument();
      });
    });

    it("renders VIEWER role variant banner when viewer accesses dashboard", async () => {
      currentUser = { id: "viewer-01", username: "viewer", role: "VIEWER" };

      (dashboardApi.getSummary as any).mockResolvedValue({
        total: 5,
        drafts: 0,
        inProgress: 0,
        submittedForReview: 0,
        queryRaised: 0,
        approved: 5,
        rejected: 0,
      });

      (dashboardApi.getStatistics as any).mockResolvedValue({
        passRate: 100.0,
        failRate: 0.0,
        reportsByModel: [],
        recentActivity: [],
      });

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Role variant message
        expect(
          screen.getByText(/You can view approved reports only/i)
        ).toBeInTheDocument();
      });
    });
  });
});
