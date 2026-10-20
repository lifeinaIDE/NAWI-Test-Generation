import { useState, useEffect, useRef } from "react";
import { calculationsApi } from "../api";
import type { CalculationResult } from "../types";

export type CalculationEndpoint =
  | "weighingPerformance"
  | "eccentricity"
  | "repeatability"
  | "discrimination";

interface UseCalculationOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useCalculation(
  endpoint: CalculationEndpoint,
  payload: Record<string, unknown> | null,
  options: UseCalculationOptions = {}
) {
  const { enabled = true, debounceMs = 400 } = options;

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of the active request sequence to discard stale responses
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled || !payload) {
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      try {
        const fn = calculationsApi[endpoint];
        if (!fn) {
          throw new Error(`Unknown calculation endpoint: ${endpoint}`);
        }
        const data = await fn(payload);

        // Only update state if this is still the most recent request
        if (currentRequestId === requestIdRef.current) {
          setResult(data);
          setLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (currentRequestId === requestIdRef.current) {
          setError(err.message || "Failed to calculate compliance.");
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [endpoint, JSON.stringify(payload), enabled, debounceMs]);

  return { result, loading, error };
}
