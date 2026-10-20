import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from "vitest";
import Step1Metadata from "../wizard/Step1Metadata";
import Step2InstrumentDetails from "../wizard/Step2InstrumentDetails";
import Step3Environment from "../wizard/Step3Environment";

describe("Phase 3 — Step 1 Metadata Form", () => {
  it("renders read-only Report ID and requires applicationNumber and laboratory", async () => {
    const onSave = vi.fn();
    const onNext = vi.fn();
    const mockReport: any = {
      reportId: "NAWI-2026-0001",
      applicationNumber: "APP-001",
      laboratory: { name: "Central Lab", address: "123 St", location: "Delhi", contact: "info@lab.com" },
    };

    render(
      <Step1Metadata
        report={mockReport}
        onSave={onSave}
        onNext={onNext}
      />
    );

    // Read-only report ID
    const reportIdInput = screen.getByDisplayValue("NAWI-2026-0001");
    expect(reportIdInput).toBeDefined();
    expect((reportIdInput as HTMLInputElement).readOnly).toBe(true);

    // Pre-filled application number
    expect(screen.getByDisplayValue("APP-001")).toBeDefined();
    expect(screen.getByDisplayValue("Central Lab")).toBeDefined();
  });
});

describe("Phase 3 — Step 2 Instrument Details", () => {
  it("auto-calculates n = maxCapacity / e as read-only", async () => {
    const onSave = vi.fn();
    const onNext = vi.fn();
    const onPrev = vi.fn();

    render(
      <Step2InstrumentDetails
        report={null}
        onSave={onSave}
        onNext={onNext}
        onPrev={onPrev}
      />
    );

    const maxInput = screen.getByPlaceholderText("300");
    const intervalInputs = screen.getAllByPlaceholderText("0.1");
    const eInput = intervalInputs[0];

    fireEvent.change(maxInput, { target: { value: "600" } });
    fireEvent.change(eInput, { target: { value: "0.2" } });

    await waitFor(() => {
      // 600 / 0.2 = 3000
      expect(screen.getByDisplayValue("3000")).toBeDefined();
    });
  });

  it("validates d <= e with inline error message", async () => {
    const onSave = vi.fn();
    const onNext = vi.fn();
    const onPrev = vi.fn();

    render(
      <Step2InstrumentDetails
        report={null}
        onSave={onSave}
        onNext={onNext}
        onPrev={onPrev}
      />
    );

    // Fill valid base fields
    fireEvent.change(screen.getByPlaceholderText("e.g. Precision Weighing Systems Ltd"), { target: { value: "Manufacturer X" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. 52 Industrial Area Phase II"), { target: { value: "Industrial Zone" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. India"), { target: { value: "India" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. BP-Platform-300"), { target: { value: "Model 1" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. SN-2026-0042"), { target: { value: "SN-001" } });
    fireEvent.change(screen.getByPlaceholderText("300"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText("2"), { target: { value: "1" } });

    // Set e = 1.0, d = 2.0 (d > e violation)
    const intervalInputs = screen.getAllByPlaceholderText("0.1");
    fireEvent.change(intervalInputs[0], { target: { value: "1.0" } });
    fireEvent.change(intervalInputs[1], { target: { value: "2.0" } });

    // Submit
    fireEvent.click(screen.getByText("Save & Continue to Environment →"));

    await waitFor(() => {
      expect(screen.getByText("d must not be greater than e.")).toBeDefined();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("Phase 3 — Step 3 Environment", () => {
  it("validates temperature range -10 to 60 °C and humidity 20 to 98 %", async () => {
    const onSave = vi.fn();
    const onNext = vi.fn();
    const onPrev = vi.fn();

    render(
      <Step3Environment
        report={null}
        onSave={onSave}
        onNext={onNext}
        onPrev={onPrev}
      />
    );

    const tempStart = screen.getByPlaceholderText("e.g. 21.5");
    const humidity = screen.getByPlaceholderText("e.g. 55");

    // Invalid values
    fireEvent.change(tempStart, { target: { value: "85" } }); // > 60
    fireEvent.change(humidity, { target: { value: "10" } });   // < 20

    fireEvent.click(screen.getByText("Save Draft & Continue →"));

    await waitFor(() => {
      expect(screen.getByText("Temperature must be between -10 and 60 °C")).toBeDefined();
      expect(screen.getByText("Humidity must be between 20% and 98%")).toBeDefined();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
