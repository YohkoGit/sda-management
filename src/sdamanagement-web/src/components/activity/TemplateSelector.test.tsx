import { describe, it, expect, beforeAll, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { activityTemplateService } from "@/services/activityTemplateService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
import TemplateSelector from "./TemplateSelector";

// Radix UI jsdom polyfills
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const mockTemplates: ActivityTemplateListItem[] = [
  {
    id: 1,
    name: "Culte du Sabbat",
    description: "Service principal du samedi",
    roleSummary: "Predicateur (1), Ancien (1)",
    roleCount: 2,
    roles: [
      { id: 1, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0 },
      { id: 2, roleName: "Ancien", defaultHeadcount: 1, sortOrder: 1 },
    ],
  },
  {
    id: 2,
    name: "Sainte-Cene",
    description: "Service avec communion",
    roleSummary: "Predicateur (1), Lavement (4)",
    roleCount: 2,
    roles: [
      { id: 3, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0 },
      { id: 4, roleName: "Lavement", defaultHeadcount: 4, sortOrder: 1 },
    ],
  },
];

function mockGetAll(data: ActivityTemplateListItem[] = mockTemplates) {
  return vi.spyOn(activityTemplateService, "getAll").mockResolvedValue({
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as never,
  });
}

function mockGetAllError() {
  return vi.spyOn(activityTemplateService, "getAll").mockRejectedValue(
    new Error("Network error")
  );
}

describe("TemplateSelector", () => {
  it("renders template cards when templates loaded", async () => {
    const spy = mockGetAll();
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
    expect(screen.getByText("Sainte-Cene")).toBeInTheDocument();
    expect(screen.getByText("Predicateur (1), Ancien (1)")).toBeInTheDocument();
    expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("shows loading skeletons during fetch", () => {
    // Don't resolve the promise to keep loading state
    vi.spyOn(activityTemplateService, "getAll").mockReturnValue(
      new Promise(() => {}) as never
    );

    render(
      <TemplateSelector onSelect={vi.fn()} selectedId={null} isOwner={false} />
    );

    // Should show subtitle text (loading state indicator)
    expect(
      screen.getByText("Sélectionnez un modèle pour pré-remplir les rôles, ou créez une activité personnalisée.")
    ).toBeInTheDocument();
  });

  it("shows empty state with OWNER link when no templates", async () => {
    const spy = mockGetAll([]);
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={true} />
    );

    await waitFor(() => {
      expect(screen.getByText("Aucun modèle disponible.")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Créez des modèles/)
    ).toBeInTheDocument();

    spy.mockRestore();
  });

  it("shows empty state with admin message when no templates", async () => {
    const spy = mockGetAll([]);
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Aucun modèle disponible.")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Contactez l/)
    ).toBeInTheDocument();

    spy.mockRestore();
  });

  it("shows error state with retry button on fetch failure", async () => {
    const spy = mockGetAllError();
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Impossible de charger les modèles.")).toBeInTheDocument();
    });
    expect(screen.getByText("Réessayer")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("selecting a template card calls onSelect with template data", async () => {
    const user = userEvent.setup();
    const spy = mockGetAll();
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Culte du Sabbat"));

    expect(onSelect).toHaveBeenCalledWith(mockTemplates[0]);

    spy.mockRestore();
  });

  it("selecting 'Custom' card calls onSelect with null", async () => {
    const user = userEvent.setup();
    const spy = mockGetAll();
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Activité sans modèle"));

    expect(onSelect).toHaveBeenCalledWith(null);

    spy.mockRestore();
  });

  it("selected card has aria-checked='true'", async () => {
    const spy = mockGetAll();

    render(
      <TemplateSelector onSelect={vi.fn()} selectedId={1} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const selectedCard = screen.getByRole("radio", {
      name: /Culte du Sabbat/,
    });
    expect(selectedCard).toHaveAttribute("aria-checked", "true");

    spy.mockRestore();
  });

  it("custom card has aria-checked='true' when selectedId is null and templates exist", async () => {
    const spy = mockGetAll();

    render(
      <TemplateSelector onSelect={vi.fn()} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const customCard = screen.getByRole("radio", {
      name: /Activité sans modèle/,
    });
    expect(customCard).toHaveAttribute("aria-checked", "true");

    spy.mockRestore();
  });

  it("keyboard Enter on focused card triggers selection", async () => {
    const user = userEvent.setup();
    const spy = mockGetAll();
    const onSelect = vi.fn();

    render(
      <TemplateSelector onSelect={onSelect} selectedId={null} isOwner={false} />
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const card = screen.getByRole("radio", { name: /Culte du Sabbat/ });
    card.focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(mockTemplates[0]);

    spy.mockRestore();
  });
});
