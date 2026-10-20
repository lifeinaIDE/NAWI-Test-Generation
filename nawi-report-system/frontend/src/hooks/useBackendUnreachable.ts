import { useState, useEffect } from "react";
import { connectionState } from "../api/client";

/**
 * Custom hook to track backend unreachable status.
 * Used across views to disable mutating buttons when backend is down.
 */
export function useBackendUnreachable(): boolean {
  const [isUnreachable, setIsUnreachable] = useState(connectionState.isBackendUnreachable);

  useEffect(() => {
    return connectionState.subscribe(setIsUnreachable);
  }, []);

  return isUnreachable;
}

export default useBackendUnreachable;
