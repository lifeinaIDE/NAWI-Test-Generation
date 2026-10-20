import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import RuleAdmin from "../pages/RuleAdmin";
import type { RuleSet } from "../types";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth hook
const mockAdmin = {
  id: "user-admin-01",
  username: "admin",
  role: "ADMIN",
};
let currentUser: any = { ...mockAdmin };

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: currentUser,
  }),
}));

// Mock API
vi.mock("../api", () => ({
  rulesApi: {
    list: vi.fn(),
    getActive: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
  },
}));

import { rulesApi } from "../api";

const mockRuleSets: RuleSet[] = [
  {
    ruleSetId: "OIML-R76-PROTOTYPE-V1",
    standard: "OIML R-76",
    edition: "Prototype configuration — requires domain validation",
    effectiveFrom: "2026-01-01",
    changeNotes: "Initial prototype rule-set.",
    status: "ACTIVE",
    createdBy: "system",
    createdAt: "2026-01-01T00:00:00Z",
    warningRatio: 0.9,
    mpeRules: {
      III: [
        { minIntervals: 0, maxIntervals: 5000, mpeInE: 0.5 },
        { minIntervals: 5000, maxIntervals: 20000, mpeInE: 1.0 },
        { minIntervals: 20000, maxIntervals: 100000, mpeInE: 1.5 },
      ],
      I: [{ minIntervals: 0, maxIntervals: 50000, mpeInE: 0.5 }],
      II: [{ minIntervals: 0, maxIntervals: 5000, mpeInE: 0.5 }],
      IIII: [{ minIntervals: 0, maxIntervals: 50, mpeInE: 0.5 }],
    },
    testRules: {
      weighingPerformance: { criterion: "abs(observedError) <= mpe" },
      eccentricity: { criterion: "abs(error_at_each_position) <= mpe" },
      repeatability: { criterion: "max_reading - min_reading <= mpe" },
      discrimination: { criterion: "delta_indication >= 1.0 * d" },
    },
    isActive: true,
    isLocked: false,
  },
  {
    ruleSetId: "OIML-R76-2006-V2",
    standard: "OIML R-76",
    edition: "Draft update for Class III verification",
    effectiveFrom: "2026-04-01",
    changeNotes: "Draft for testing thresholds.",
    status: "DRAFT",
    createdBy: "admin",
    createdAt: "2026-03-01T10:00:00Z",
    warningRatio: 0.9,
    mpeRules: {
      III: [
        { minIntervals: 0, maxIntervals: 5000, mpeInE: 0.5 },
        { minIntervals: 5000, maxIntervals: 20000, mpeInE: 1.0 },
      ],
      I: [{ minIntervals: 0, maxIntervals: 50000, mpeInE: 0.5 }],
      II: [{ minIntervals: 0, maxIntervals: 5000, mpeInE: 0.5 }],
      IIII: [{ minIntervals: 0, maxIntervals: 50, mpeInE: 0.5 }],
    },
    testRules: {
      weighingPerformance: { criterion: "abs(observedError) <= mpe" },
      eccentricity: { criterion: "abs(error_at_each_position) <= mpe" },
      repeatability: { criterion: "max_reading - min_reading <= mpe" },
      discrimination: { criterion: "delta_indication >= 1.0 * d" },
    },
    isActive: false,
    isLocked: false,
  },
  {
    ruleSetId: "OIML-R76-2006-V3",
    standard: "OIML R-76",
    edition: "Approved historical configuration",
    effectiveFrom: "2026-02-01",
    changeNotes: "Referenced by approved report NAWI-2026-0001.",
    status: "ARCHIVED",
    createdBy: "admin",
    createdAt: "2026-02-01T10:00:00Z",
    warningRatio: 0.9,
    mpeRules: {
      III: [{ minIntervals: 0, maxIntervals: 5000, mpeInE: 0.5 }],
    },
    testRules: {
      weighingPerformance: { criterion: "abs(observedError) <= mpe" },
    },
    isActive: false,
    isLocked: true,
  },
];

describe("Phase 9: RuleAdmin Frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { ...mockAdmin };
    (rulesApi.list as any).mockResolvedValue([...mockRuleSets]);
  });

  it("renders list of rule versions with ID, edition, status, effective date, and creator", async () => {
    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Rule Administration")).toBeInTheDocument();
      expect(screen.getAllByText("OIML-R76-PROTOTYPE-V1").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("OIML-R76-2006-V2")).toBeInTheDocument();
      expect(screen.getByText("OIML-R76-2006-V3")).toBeInTheDocument();

      // Badges
      expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("Archived")).toBeInTheDocument();

      // Effective dates & creators
      expect(screen.getByText(/Effective: 2026-01-01/i)).toBeInTheDocument();
      expect(screen.getByText(/By: system/i)).toBeInTheDocument();

      // Locked rule-set shows lock icon
      expect(screen.getByText(/Locked/i)).toBeInTheDocument();
    });
  });

  it("displays D3 label next to every threshold in formatted view and MPE table", async () => {
    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      // D3 badge in table header or rows
      const d3Badges = screen.getAllByText("D3");
      expect(d3Badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows disabled edit action for locked rule-set", async () => {
    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("OIML-R76-2006-V3")).toBeInTheDocument();
    });

    // Select the locked rule-set
    fireEvent.click(screen.getByText("OIML-R76-2006-V3"));

    await waitFor(() => {
      const editButton = screen.getByRole("button", { name: /Locked \(No Edit\)/i });
      expect(editButton).toBeDisabled();
    });
  });

  it("handles Create New Draft and switches to edit mode", async () => {
    const newDraftResponse: RuleSet = {
      ruleSetId: "OIML-R76-2006-V4",
      standard: "OIML R-76",
      edition: "Draft version",
      effectiveFrom: "2026-10-20",
      changeNotes: "Draft version created from OIML-R76-PROTOTYPE-V1",
      status: "DRAFT",
      createdBy: "admin",
      createdAt: "2026-10-20T10:00:00Z",
      warningRatio: 0.9,
      mpeRules: {
        III: [{ minIntervals: 0, maxIntervals: 5000, mpeInE: 0.5 }],
      },
      testRules: {
        weighingPerformance: { criterion: "abs(observedError) <= mpe" },
      },
      isActive: false,
      isLocked: false,
    };

    (rulesApi.create as any).mockResolvedValue(newDraftResponse);

    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Create New Draft/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Create New Draft/i }));

    await waitFor(() => {
      expect(rulesApi.create).toHaveBeenCalled();
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
      expect(screen.getByText("JSON View")).toBeInTheDocument();
    });
  });

  it("supports structured MPE editing, JSON view toggle, and validation", async () => {
    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("OIML-R76-2006-V2")).toBeInTheDocument();
    });

    // Select unlocked draft
    fireEvent.click(screen.getByText("OIML-R76-2006-V2"));

    await waitFor(() => {
      const editButton = screen.getByRole("button", { name: /Edit Draft/i });
      expect(editButton).toBeEnabled();
      fireEvent.click(editButton);
    });

    // In edit mode: Validate button is present
    const validateBtn = screen.getByRole("button", { name: /Validate/i });
    expect(validateBtn).toBeInTheDocument();
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Rule-set satisfies all OIML R-76 schema and continuity requirements/i)
      ).toBeInTheDocument();
    });

    // Toggle JSON view
    const jsonToggleBtn = screen.getByRole("button", { name: /JSON View/i });
    fireEvent.click(jsonToggleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Direct Rule-Set JSON Configuration/i)).toBeInTheDocument();
    });
  });

  it("displays red 409 conflict banner if save is rejected due to locking", async () => {
    (rulesApi.update as any).mockRejectedValue({
      response: {
        status: 409,
        data: {
          detail: "Rule-set is locked — referenced by an approved report and cannot be edited.",
        },
      },
    });

    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("OIML-R76-2006-V2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("OIML-R76-2006-V2"));

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /Edit Draft/i }));
    });

    // Attempt save
    fireEvent.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/409 Conflict: Rule-Set Locked/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Rule-set is referenced by an approved report and cannot be edited/i)
      ).toBeInTheDocument();
    });
  });

  it("prompts with confirmation text before activating a rule-set", async () => {
    (rulesApi.activate as any).mockResolvedValue({
      ...mockRuleSets[1],
      isActive: true,
      status: "ACTIVE",
    });

    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("OIML-R76-2006-V2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("OIML-R76-2006-V2"));

    await waitFor(() => {
      const activateButton = screen.getByRole("button", { name: /^Activate$/i });
      fireEvent.click(activateButton);
    });

    // Confirmation modal appears with exact required text
    await waitFor(() => {
      expect(
        screen.getByText(
          "New reports will use this version. Existing submitted/approved reports keep their locked version."
        )
      ).toBeInTheDocument();
    });

    // Confirm activation
    const confirmBtn = screen.getByRole("button", { name: /Confirm Activation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(rulesApi.activate).toHaveBeenCalledWith("OIML-R76-2006-V2");
    });
  });

  it("blocks non-admin users with Access Denied", async () => {
    currentUser = { id: "tech-01", username: "technician", role: "TECHNICIAN" };

    render(
      <MemoryRouter>
        <RuleAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText(/You do not have administrative privileges/i)
      ).toBeInTheDocument();
    });
  });
});
