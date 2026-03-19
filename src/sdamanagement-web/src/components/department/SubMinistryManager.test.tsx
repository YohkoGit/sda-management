import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import { authHandlers } from "@/mocks/handlers/auth";
import { SubMinistryManager } from "./SubMinistryManager";
import type { SubMinistryResponse } from "@/services/departmentService";

const mockOfficers = {
  items: [
    {
      userId: 10,
      firstName: "Marie",
      lastName: "Dupont",
      avatarUrl: null,
      departments: [
        { id: 1, name: "JA", abbreviation: "JA", color: "#4F46E5" },
      ],
    },
    {
      userId: 11,
      firstName: "Jean",
      lastName: "Martin",
      avatarUrl: null,
      departments: [
        { id: 1, name: "JA", abbreviation: "JA", color: "#4F46E5" },
      ],
    },
    {
      userId: 12,
      firstName: "Sophie",
      lastName: "Beaumont",
      avatarUrl: null,
      departments: [
        { id: 2, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" },
      ],
    },
  ],
  nextCursor: null,
};

const server = setupServer(
  ...authHandlers,
  http.get("/api/users/assignable-officers", () =>
    HttpResponse.json(mockOfficers)
  ),
  http.post("/api/departments/:deptId/sub-ministries", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: 200,
        name: body.name,
        leadUserId: body.leadUserId ?? null,
        leadFirstName: body.leadUserId ? "Marie" : null,
        leadLastName: body.leadUserId ? "Dupont" : null,
        leadAvatarUrl: null,
      },
      { status: 201 }
    );
  }),
  http.put("/api/departments/:deptId/sub-ministries/:id", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 1,
      name: body.name,
      leadUserId: body.leadUserId ?? null,
      leadFirstName: body.leadUserId ? "Marie" : null,
      leadLastName: body.leadUserId ? "Dupont" : null,
      leadAvatarUrl: null,
    });
  }),
  http.delete("/api/departments/:deptId/sub-ministries/:id", () =>
    new HttpResponse(null, { status: 204 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const subMinistries: SubMinistryResponse[] = [
  {
    id: 1,
    name: "Eclaireurs",
    leadUserId: 10,
    leadFirstName: "Marie",
    leadLastName: "Dupont",
    leadAvatarUrl: null,
  },
  {
    id: 2,
    name: "Ambassadeurs",
    leadUserId: null,
    leadFirstName: null,
    leadLastName: null,
    leadAvatarUrl: null,
  },
];

describe("SubMinistryManager", () => {
  it("renders sub-ministry list with lead names", () => {
    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    expect(screen.getByText("Ambassadeurs")).toBeInTheDocument();
    expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });

  it("shows initials avatar for lead with no avatarUrl", () => {
    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    // Marie Dupont should have initials "MD"
    const avatar = screen.getByRole("img", { name: "Marie Dupont" });
    expect(avatar).toBeInTheDocument();
  });

  it("shows dash for sub-ministry without lead", () => {
    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    // Ambassadeurs has no lead — should show "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows add button", () => {
    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    expect(
      screen.getByText("Ajouter un sous-ministère")
    ).toBeInTheDocument();
  });

  it("opens add form with name input when clicking add button", async () => {
    const user = userEvent.setup();

    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    await user.click(screen.getByText("Ajouter un sous-ministère"));

    // Name input should appear
    const input = screen.getByPlaceholderText("Éclaireurs");
    expect(input).toBeInTheDocument();
  });

  it("enters edit mode with name pre-filled when clicking edit", async () => {
    const user = userEvent.setup();

    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    // Click edit on first sub-ministry (Eclaireurs)
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);

    // Name input should be pre-filled
    const inputs = screen.getAllByDisplayValue("Eclaireurs");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders lead picker in add form with default no-lead option", async () => {
    const user = userEvent.setup();

    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    // Open add form
    await user.click(screen.getByText("Ajouter un sous-ministère"));

    // Lead picker renders with "Aucun responsable" as default
    await waitFor(() => {
      expect(
        screen.getByText("Aucun responsable")
      ).toBeInTheDocument();
    });

    // The combobox trigger should be present (lead picker rendered)
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("includes leadUserId in update mutation payload from edit state", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.put("/api/departments/:deptId/sub-ministries/:id", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 1,
          name: capturedBody.name,
          leadUserId: capturedBody.leadUserId ?? null,
          leadFirstName: capturedBody.leadUserId ? "Marie" : null,
          leadLastName: capturedBody.leadUserId ? "Dupont" : null,
          leadAvatarUrl: null,
        });
      })
    );

    const user = userEvent.setup();

    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    // Click edit on Eclaireurs (leadUserId=10, pre-fills editLeadUserId)
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);

    // Confirm the edit (name pre-filled as "Eclaireurs", lead pre-filled as 10)
    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    await user.click(confirmBtn);

    // Verify mutation payload preserves leadUserId from pre-filled state
    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.name).toBe("Eclaireurs");
      expect(capturedBody!.leadUserId).toBe(10);
    });
  });

  it("sends null leadUserId in mutation when editing sub-ministry without lead", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.put("/api/departments/:deptId/sub-ministries/:id", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: 2,
          name: capturedBody.name,
          leadUserId: null,
          leadFirstName: null,
          leadLastName: null,
          leadAvatarUrl: null,
        });
      })
    );

    const user = userEvent.setup();

    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    // Click edit on Ambassadeurs (leadUserId=null)
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[1]);

    // Confirm the edit
    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    await user.click(confirmBtn);

    // Verify mutation payload sends null leadUserId
    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
      expect(capturedBody!.name).toBe("Ambassadeurs");
      expect(capturedBody!.leadUserId).toBeNull();
    });
  });

  it("fires delete mutation when clicking delete button", async () => {
    const user = userEvent.setup();
    let deleteCalled = false;

    server.use(
      http.delete("/api/departments/:deptId/sub-ministries/:id", () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <SubMinistryManager departmentId={1} subMinistries={subMinistries} />
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });
});
