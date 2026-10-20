import { useEffect, useCallback } from "react";

/**
 * Hook to guard against accidental navigation or tab closure with unsaved changes.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const confirmLeave = useCallback(
    (onConfirm: () => void) => {
      if (isDirty) {
        const proceed = window.confirm("You have unsaved changes. Discard changes and leave?");
        if (proceed) {
          onConfirm();
        }
      } else {
        onConfirm();
      }
    },
    [isDirty]
  );

  return { confirmLeave };
}
