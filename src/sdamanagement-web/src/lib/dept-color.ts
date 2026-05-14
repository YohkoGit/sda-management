/**
 * Map a department abbreviation or color hint to one of the spot colors
 * defined in the design system. Returns the CSS variable name (without var(...)).
 *
 * Departments listed in the design handoff:
 *  - JA           → bordeaux
 *  - MF (Famille) → plum
 *  - MIFEM        → umber
 *  - ME (Music)   → azure
 *  - Diaconnat    → moss
 *
 * Anything else falls back to ink-3 (neutral grey).
 */
const DEPT_PALETTE: Record<string, string> = {
  ja: "var(--bordeaux)",
  mf: "var(--plum)",
  mifem: "var(--umber)",
  me: "var(--azure)",
  diac: "var(--moss)",
  diaconnat: "var(--moss)",
  diaconat: "var(--moss)",
  ae: "var(--gilt-2)",
  mp: "var(--ink-2)",
}

export function deptSwatchColor(input?: {
  abbreviation?: string | null
  color?: string | null
}): string {
  if (!input) return "var(--ink-3)"
  const explicit = input.color?.trim()
  if (explicit && /^#[0-9a-f]{3,8}$/i.test(explicit)) return explicit
  const key = (input.abbreviation || "").toLowerCase().trim()
  return DEPT_PALETTE[key] ?? "var(--ink-3)"
}

export function deptSwatchStyle(input?: {
  abbreviation?: string | null
  color?: string | null
}): React.CSSProperties {
  return { backgroundColor: deptSwatchColor(input) }
}
