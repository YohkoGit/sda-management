import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { isAxiosError } from "axios";
import api from "./api";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("api response interceptor — 401 handling", () => {
  it("does NOT trigger refresh-retry when /api/auth/login returns 401", async () => {
    let loginCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.post("/api/auth/login", () => {
        loginCalls += 1;
        return HttpResponse.json(
          { type: "urn:sdac:invalid-credentials", status: 401 },
          { status: 401 }
        );
      }),
      http.post("/api/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    await expect(
      api.post("/api/auth/login", { email: "x@y.z", password: "wrong" })
    ).rejects.toSatisfy((err: unknown) => isAxiosError(err) && err.response?.status === 401);

    expect(loginCalls).toBe(1);
    expect(refreshCalls).toBe(0);
  });

  it.each([
    "/api/auth/initiate",
    "/api/auth/set-password",
    "/api/auth/password-reset/request",
    "/api/auth/password-reset/confirm",
  ])("does NOT trigger refresh-retry when %s returns 401", async (path) => {
    let refreshCalls = 0;
    server.use(
      http.post(path, () =>
        HttpResponse.json({ status: 401 }, { status: 401 })
      ),
      http.post("/api/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    await expect(api.post(path, {})).rejects.toBeDefined();
    expect(refreshCalls).toBe(0);
  });

  it("DOES refresh-and-retry when /api/auth/me returns 401 then 200", async () => {
    let meCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.get("/api/auth/me", () => {
        meCalls += 1;
        if (meCalls === 1) {
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }
        return HttpResponse.json({ userId: 1, email: "u@e.com" });
      }),
      http.post("/api/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const response = await api.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(meCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });

  it("DOES refresh-and-retry when a protected resource returns 401", async () => {
    let dataCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.get("/api/activities", () => {
        dataCalls += 1;
        if (dataCalls === 1) {
          return HttpResponse.json({ status: 401 }, { status: 401 });
        }
        return HttpResponse.json([]);
      }),
      http.post("/api/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const response = await api.get("/api/activities");

    expect(response.status).toBe(200);
    expect(dataCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });
});
