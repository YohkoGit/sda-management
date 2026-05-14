import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { ConflictAlertDialog } from "./ConflictAlertDialog";

describe("ConflictAlertDialog", () => {
  const defaultProps = {
    open: true,
    onReload: vi.fn(),
    onOverwrite: vi.fn(),
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open={true} with correct title and description", () => {
    render(<ConflictAlertDialog {...defaultProps} />);

    expect(screen.getByText("Conflit de modification")).toBeInTheDocument();
    expect(
      screen.getByText(/Cette activité a été modifiée par un autre administrateur/),
    ).toBeInTheDocument();
  });

  it("does not render dialog when open={false}", () => {
    render(<ConflictAlertDialog {...defaultProps} open={false} />);

    expect(screen.queryByText("Conflit de modification")).not.toBeInTheDocument();
  });

  it("calls onReload when 'Recharger les données' button is clicked", async () => {
    const onReload = vi.fn();
    const user = userEvent.setup();

    render(<ConflictAlertDialog {...defaultProps} onReload={onReload} />);

    await user.click(screen.getByText("Recharger les données"));

    expect(onReload).toHaveBeenCalledOnce();
  });

  it("calls onOverwrite when 'Écraser avec mes modifications' button is clicked", async () => {
    const onOverwrite = vi.fn();
    const user = userEvent.setup();

    render(<ConflictAlertDialog {...defaultProps} onOverwrite={onOverwrite} />);

    await user.click(screen.getByText("Écraser avec mes modifications"));

    expect(onOverwrite).toHaveBeenCalledOnce();
  });

  it("overwrite button has destructive styling", () => {
    render(<ConflictAlertDialog {...defaultProps} />);

    const overwriteButton = screen.getByText("Écraser avec mes modifications");
    // Destructive variant now uses CSS var --rose (e.g., bg-[var(--rose)])
    expect(overwriteButton.className).toContain("bg-[var(--rose)]");
  });

  it("pressing Escape calls onOpenChange to close dialog", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<ConflictAlertDialog {...defaultProps} onOpenChange={onOpenChange} />);

    expect(screen.getByText("Conflit de modification")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
