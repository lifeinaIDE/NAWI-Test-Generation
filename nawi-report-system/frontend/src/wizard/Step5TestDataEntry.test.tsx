import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from "vitest";
import Step5TestDataEntry from "./Step5TestDataEntry";
import { calculationsApi } from "../api";

// Mock the API and recharts
vi.mock("../api", () => ({
  calculationsApi: {
    weighingPerformance: vi.fn(),
    eccentricity: vi.fn(),
    repeatability: vi.fn(),
    discrimination: vi.fn(),
  }
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div>LineChart</div>,
  Line: () => <div>Line</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Tooltip: () => <div>Tooltip</div>,
}));

describe("Step5TestDataEntry", () => {
  it("renders empty state when no applicable tests", () => {
    render(<Step5TestDataEntry report={{ tests: [] } as any} onSave={vi.fn()} onNext={vi.fn()} onPrev={vi.fn()} />);
    expect(screen.getByText(/No tests selected as applicable/i)).toBeDefined();
  });

  it("renders Weighing Performance form and calls API", async () => {
    const report = {
      tests: [{ testCode: "WEIGHING_PERFORMANCE", applicable: true, observations: [] }]
    } as any;
    
    // Mock the calculation result
    vi.mocked(calculationsApi.weighingPerformance).mockResolvedValueOnce({
      result: "PASS",
      maxPermissibleError: 1.0,
      observedError: 0.5,
      formulaUsed: "TEST"
    } as any);

    render(<Step5TestDataEntry report={report} onSave={vi.fn()} onNext={vi.fn()} onPrev={vi.fn()} />);
    
    // Fill form
    const loadInput = screen.getAllByRole("spinbutton")[0];
    const indInput = screen.getAllByRole("spinbutton")[1];
    const zeroInput = screen.getAllByRole("spinbutton")[2];

    fireEvent.change(loadInput, { target: { name: "testLoad", value: "100" } });
    fireEvent.change(indInput, { target: { name: "indication", value: "100.5" } });
    fireEvent.change(zeroInput, { target: { name: "zeroError", value: "0" } });

    await waitFor(() => {
      expect(calculationsApi.weighingPerformance).toHaveBeenCalledWith({
        testLoad: 100,
        indication: 100.5,
        zeroError: 0,
        e: 1,
        accuracyClass: "III"
      });
    });

    // Check PASS badge
    expect(screen.getByText("PASS")).toBeDefined();
    expect(screen.getByText("PASS").className).toContain("text-green-400");
  });

  it("renders FAIL badge when CalculationResult is FAIL", async () => {
    const report = {
      tests: [{ testCode: "WEIGHING_PERFORMANCE", applicable: true, observations: [] }]
    } as any;
    
    vi.mocked(calculationsApi.weighingPerformance).mockResolvedValueOnce({
      result: "FAIL",
      maxPermissibleError: 1.0,
      observedError: 1.5,
      formulaUsed: "TEST"
    } as any);

    render(<Step5TestDataEntry report={report} onSave={vi.fn()} onNext={vi.fn()} onPrev={vi.fn()} />);
    
    const loadInput = screen.getAllByRole("spinbutton")[0];
    const indInput = screen.getAllByRole("spinbutton")[1];

    fireEvent.change(loadInput, { target: { name: "testLoad", value: "100" } });
    fireEvent.change(indInput, { target: { name: "indication", value: "101.5" } });

    await waitFor(() => {
      expect(screen.getByText("FAIL")).toBeDefined();
    });
    expect(screen.getByText("FAIL").className).toContain("text-red-400");
  });
});
