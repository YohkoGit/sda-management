import { http, HttpResponse } from "msw";
import type { UserListItem, PagedResponse } from "@/services/userService";

const mockUsers: UserListItem[] = [
  {
    id: 2,
    firstName: "Marie-Claire",
    lastName: "Legault",
    email: "mc.legault@gmail.com",
    role: "Viewer",
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

export const userHandlersEmpty = [
  http.get("/api/users", () => {
    return HttpResponse.json(mockEmptyResponse);
  }),
];

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

