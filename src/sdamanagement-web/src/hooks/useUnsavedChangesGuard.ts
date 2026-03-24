import { useEffect } from "react";

/**
 * Registers a `beforeunload` handler while the form has unsaved changes,
 * prompting the browser's native "Leave site?" dialog on close/refresh.
 */
export function useUnsavedChangesGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
