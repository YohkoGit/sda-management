import { http, HttpResponse } from "msw";
import type { UserListItem, PagedResponse } from "@/services/userService";

const mockUsers: UserListItem[] = [
  {
    id: 2,
    firstName: "Marie-Claire",
    lastName: "Legault",
    email: "mc.legault@gmail.com",
    role: "Viewer",
    avatarUrl: "/api/avatars/2?v=123456",
    departments: [
      { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
    ],
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: 3,
    firstName: "Jean-Pierre",
    lastName: "Augustin",
    email: "jp.augustin@gmail.com",
    role: "Admin",
    avatarUrl: null,
    departments: [
      { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
      { id: 2, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" },
    ],
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: 4,
    firstName: "Sophie",
    lastName: "Beaumont",
    email: "sophie.b@gmail.com",
    role: "Viewer",
    avatarUrl: null,
    departments: [
      { id: 2, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" },
    ],
    createdAt: "2026-03-02T00:00:00Z",
  },
  {
    id: 5,
    firstName: "Patrick",
    lastName: "Charles",
    email: "p.charles@gmail.com",
    role: "Viewer",
    avatarUrl: null,
    departments: [
      { id: 3, name: "Diaconat", abbreviation: "DIA", color: "#10B981" },
    ],
    createdAt: "2026-03-02T00:00:00Z",
  },
  {
    id: 6,
    firstName: "Nicole",
    lastName: "Dupont",
    email: "nicole.d@gmail.com",
    role: "Admin",
    avatarUrl: "/api/avatars/6?v=789012",
    departments: [
      { id: 2, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" },
    ],
    createdAt: "2026-03-03T00:00:00Z",
  },
];

const mockPagedResponse: PagedResponse<UserListItem> = {
  items: mockUsers,
  nextCursor: null,
};

const mockEmptyResponse: PagedResponse<UserListItem> = {
  items: [],
  nextCursor: null,
};

export const assignableOfficerHandlers = [
  http.get("/api/users/assignable-officers", () => {
    return HttpResponse.json({
      items: mockUsers.map((u) => ({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl ?? null,
        departments: u.departments,
      })),
      nextCursor: null,
    });
  }),
];

export const assignableOfficerHandlersEmpty = [
  http.get("/api/users/assignable-officers", () => {
    return HttpResponse.json({ items: [], nextCursor: null });
  }),
];

export const userHandlers = [
  http.get("/api/users", () => {
    return HttpResponse.json(mockPagedResponse);
  }),
  http.post("/api/users/bulk", async ({ request }) => {
    const body = (await request.json()) as { users: Record<string, unknown>[] };
    const created = body.users.map((u, i) => ({
      id: 100 + i,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isGuest: false,
      departments: [
        { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
      ],
      createdAt: "2026-03-05T00:00:00Z",
      updatedAt: "2026-03-05T00:00:00Z",
    }));
    return HttpResponse.json(
      { created, count: created.length },
      { status: 201 }
    );
  }),
  http.post("/api/users", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: 99,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: body.role,
        isGuest: false,
        departments: [
          { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
        ],
        createdAt: "2026-03-05T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z",
      },
      { status: 201 }
    );
  }),
];

let guestIdCounter = 500;

/** Set of userIds created via the guest mock handler. Used by activity mocks. */
export const mockGuestUserIds = new Set<number>();

export const guestHandler = http.post("/api/users/guests", async ({ request }) => {
  const body = (await request.json()) as { name: string; phone?: string };
  const name = body.name.trim();
  const lastSpace = name.lastIndexOf(" ");
  const firstName = lastSpace >= 0 ? name.slice(0, lastSpace) : name;
  const lastName = lastSpace >= 0 ? name.slice(lastSpace + 1) : "";
  const userId = guestIdCounter++;
  mockGuestUserIds.add(userId);
  return HttpResponse.json(
    { userId, firstName, lastName, isGuest: true },
    { status: 201 }
  );
});

export const userHandlersEmpty = [
  http.get("/api/users", () => {
    return HttpResponse.json(mockEmptyResponse);
  }),
];

export const userHandlerPut = http.put("/api/users/:id", async ({ request }) => {
  const body = (await request.json()) as Record<string, unknown>;
  return HttpResponse.json({
    id: 2,
    firstName: body.firstName,
    lastName: body.lastName,
    email: "mc.legault@gmail.com",
    role: body.role,
    isGuest: false,
    departments: [
      { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
    ],
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-06T00:00:00Z",
  });
});

export const userHandlerPut400 = http.put("/api/users/:id", () => {
  return HttpResponse.json(
    {
      type: "urn:sdac:validation-error",
      title: "Validation Error",
      status: 400,
      errors: { firstName: ["'First Name' must not be empty."] },
    },
    { status: 400 }
  );
});

export const userHandlerPut403 = http.put("/api/users/:id", () => {
  return new HttpResponse(null, { status: 403 });
});

export const userHandlerPut404 = http.put("/api/users/:id", () => {
  return new HttpResponse(null, { status: 404 });
});

export const userHandlers409 = http.post("/api/users", () => {
  return HttpResponse.json(
    {
      type: "urn:sdac:conflict",
      title: "Resource Conflict",
      status: 409,
      detail: "A user with this email already exists.",
    },
    { status: 409 }
  );
});

export const userHandlers403 = http.post("/api/users", () => {
  return new HttpResponse(null, { status: 403 });
});

export const userHandlerDelete = http.delete("/api/users/:id", () => {
  return new HttpResponse(null, { status: 204 });
});

export const userHandlerDelete403 = http.delete("/api/users/:id", () => {
  return new HttpResponse(null, { status: 403 });
});

export const userHandlerDelete404 = http.delete("/api/users/:id", () => {
  return new HttpResponse(null, { status: 404 });
});

export const userHandlerDelete409 = http.delete("/api/users/:id", () => {
  return HttpResponse.json(
    { message: "Cannot delete the last owner account" },
    { status: 409 }
  );
});

// --- Avatar handlers ---

export const avatarHandlerUpload = http.post("/api/avatars/:userId", () => {
  return new HttpResponse(null, { status: 204 });
});

export const avatarHandlerUpload400 = http.post("/api/avatars/:userId", () => {
  return HttpResponse.json(
    {
      type: "urn:sdac:validation-error",
      title: "Validation Error",
      status: 400,
      detail: "File size must be between 1 byte and 512000 bytes.",
    },
    { status: 400 }
  );
});

export const avatarHandlerUpload403 = http.post("/api/avatars/:userId", () => {
  return new HttpResponse(null, { status: 403 });
});

export const avatarHandlerGet = http.get("/api/avatars/:userId", ({ params }) => {
  const userId = Number(params.userId);
  // Return avatar for users 2 and 6 (those with avatarUrl in mock data)
  if (userId === 2 || userId === 6) {
    return new HttpResponse(new Uint8Array([0x00]), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "ETag": `"${Date.now()}"`,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return new HttpResponse(null, { status: 404 });
});

