import { http, HttpResponse } from "msw";

// Default mock users for testing
const mockUsers = new Map([
  [
    "viewer@test.local",
    {
      userId: 1,
      email: "viewer@test.local",
      firstName: "Test",
      lastName: "Viewer",
      role: "VIEWER",
      hasPassword: true,
    },
  ],
  [
    "admin@test.local",
    {
      userId: 3,
      email: "admin@test.local",
      firstName: "Test",
      lastName: "Admin",
      role: "ADMIN",
      hasPassword: true,
    },
  ],
  [
    "owner@test.local",
    {
      userId: 4,
      email: "owner@test.local",
      firstName: "Test",
      lastName: "Owner",
      role: "OWNER",
      hasPassword: true,
    },
  ],
  [
    "first-login@test.local",
    {
      userId: 2,
      email: "first-login@test.local",
      firstName: "First",
      lastName: "Login",
      role: "VIEWER",
      hasPassword: false,
    },
  ],
]);

export const authHandlers = [
  http.post("/api/auth/initiate", async ({ request }) => {
    const body = (await request.json()) as { email: string };
    const user = mockUsers.get(body.email);

    if (!user) {
      // Anti-enumeration: non-existent emails return "password"
      return HttpResponse.json({ flow: "password" });
    }

    return HttpResponse.json({
      flow: user.hasPassword ? "password" : "set-password",
    });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const user = mockUsers.get(body.email);

    if (!user || !user.hasPassword) {
      return HttpResponse.json(
        {
          type: "urn:sdac:invalid-credentials",
          title: "Invalid Credentials",
          status: 401,
          detail: "Identifiants invalides.",
        },
        { status: 401 }
      );
    }

    // In tests, accept any password >= 8 chars as valid
    if (body.password.length < 8) {
      return HttpResponse.json(
        {
          type: "urn:sdac:invalid-credentials",
          title: "Invalid Credentials",
          status: 401,
          detail: "Identifiants invalides.",
        },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  }),

  http.post("/api/auth/set-password", async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      newPassword: string;
    };
    const user = mockUsers.get(body.email);

    if (!user) {
      return HttpResponse.json(
        { type: "urn:sdac:not-found", title: "Not Found", status: 404 },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  }),

  http.post("/api/auth/password-reset/request", async () => {
    return HttpResponse.json({ token: "mock-reset-token-abc123" });
  }),

  http.post("/api/auth/password-reset/confirm", async ({ request }) => {
    const body = (await request.json()) as {
      token: string;
      newPassword: string;
    };

    if (body.token === "expired-token") {
      return HttpResponse.json(
        {
          type: "urn:sdac:invalid-reset-token",
          title: "Bad Request",
          status: 400,
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      message: "Password has been reset successfully.",
    });
  }),

  http.get("/api/auth/me", () => {
    return HttpResponse.json(
      { type: "urn:sdac:unauthenticated", status: 401 },
      { status: 401 }
    );
  }),

  http.post("/api/auth/refresh", () => {
    return HttpResponse.json(null, { status: 401 });
  }),
];
