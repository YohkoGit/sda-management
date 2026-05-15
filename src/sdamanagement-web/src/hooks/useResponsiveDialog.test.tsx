import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResponsiveDialog } from "./useResponsiveDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

import { useIsMobile } from "@/hooks/use-mobile";

const mockedUseIsMobile = vi.mocked(useIsMobile);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useResponsiveDialog", () => {
  it("returns Dialog components on desktop", () => {
    mockedUseIsMobile.mockReturnValue(false);

    const { result } = renderHook(() => useResponsiveDialog());

    expect(result.current.Root).toBe(Dialog);
    expect(result.current.Content).toBe(DialogContent);
    expect(result.current.Header).toBe(DialogHeader);
    expect(result.current.Title).toBe(DialogTitle);
    expect(result.current.Description).toBe(DialogDescription);
    expect(result.current.isMobile).toBe(false);
  });

  it("returns Sheet components on mobile", () => {
    mockedUseIsMobile.mockReturnValue(true);

    const { result } = renderHook(() => useResponsiveDialog());

    expect(result.current.Root).toBe(Sheet);
    expect(result.current.Content).toBe(SheetContent);
    expect(result.current.Header).toBe(SheetHeader);
    expect(result.current.Title).toBe(SheetTitle);
    expect(result.current.Description).toBe(SheetDescription);
    expect(result.current.isMobile).toBe(true);
  });

  it("returns a stable object across renders within the same viewport class", () => {
    mockedUseIsMobile.mockReturnValue(false);

    const { result, rerender } = renderHook(() => useResponsiveDialog());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("returns a new object when viewport class changes", () => {
    mockedUseIsMobile.mockReturnValue(false);
    const { result, rerender } = renderHook(() => useResponsiveDialog());
    const desktopBag = result.current;

    mockedUseIsMobile.mockReturnValue(true);
    rerender();

    expect(result.current).not.toBe(desktopBag);
    expect(result.current.Root).toBe(Sheet);
  });
});
