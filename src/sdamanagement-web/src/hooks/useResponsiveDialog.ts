import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Picks Sheet (mobile) or Dialog (desktop) component bag based on viewport.
 *
 * Component identity is stable across renders within a viewport class, so
 * mounting these once at the call site is safe — they will not remount unless
 * the viewport crosses the mobile breakpoint.
 *
 * Names are intentionally generic ({ Root, Content, Header, Title, Description })
 * because the abstraction is "responsive overlay container," not "form."
 */
export function useResponsiveDialog() {
  const isMobile = useIsMobile();

  return useMemo(() => {
    if (isMobile) {
      return {
        Root: Sheet,
        Content: SheetContent,
        Header: SheetHeader,
        Title: SheetTitle,
        Description: SheetDescription,
        isMobile: true as const,
      };
    }
    return {
      Root: Dialog,
      Content: DialogContent,
      Header: DialogHeader,
      Title: DialogTitle,
      Description: DialogDescription,
      isMobile: false as const,
    };
  }, [isMobile]);
}
