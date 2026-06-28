import { verifyUser } from "@/lib/verify-user";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const makeRequest = (authHeader?: string) =>
  new NextRequest("http://localhost/api/test", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  });

const successHandler = jest.fn(async (_req: NextRequest, { currentUser }: { currentUser: typeof fakeUser }) =>
  NextResponse.json({ ok: true, userId: currentUser.id })
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("verifyUser middleware", () => {
  describe("success", () => {
    it("calls the handler and injects currentUser when token is valid", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      const token = signToken({ userId: fakeUser.id });

      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest(`Bearer ${token}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(successHandler).toHaveBeenCalledTimes(1);
      expect(successHandler.mock.calls[0][1].currentUser).toMatchObject({
        id: fakeUser.id,
        email: fakeUser.email,
        name: fakeUser.name,
      });
    });

    it("never exposes passwordHash via currentUser", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      const token = signToken({ userId: fakeUser.id });

      const wrapped = verifyUser(successHandler);
      await wrapped(makeRequest(`Bearer ${token}`));

      const injectedUser = successHandler.mock.calls[0][1].currentUser;
      expect((injectedUser as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe("401 — missing / malformed token", () => {
    it("returns 401 with MISSING_TOKEN when Authorization header is absent", async () => {
      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("MISSING_TOKEN");
      expect(successHandler).not.toHaveBeenCalled();
    });

    it("returns 401 when header does not start with 'Bearer '", async () => {
      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest("Token abc123"));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("MISSING_TOKEN");
    });

    it("returns 401 when Bearer token is empty string", async () => {
      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest("Bearer "));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("MISSING_TOKEN");
    });
  });

  describe("401 — invalid / expired token", () => {
    it("returns 401 with INVALID_TOKEN when token is malformed", async () => {
      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest("Bearer not.a.valid.token"));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("INVALID_TOKEN");
      expect(successHandler).not.toHaveBeenCalled();
    });

    it("returns 401 with INVALID_TOKEN when token is signed with wrong secret", async () => {
      const jwt = await import("jsonwebtoken");
      const foreignToken = jwt.default.sign({ userId: "user_123" }, "wrong-secret");

      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest(`Bearer ${foreignToken}`));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("INVALID_TOKEN");
    });

    it("returns 401 with INVALID_TOKEN when token is expired", async () => {
      const jwt = await import("jsonwebtoken");
      const expiredToken = jwt.default.sign(
        { userId: "user_123" },
        process.env.JWT_SECRET!,
        { expiresIn: -1 }
      );

      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest(`Bearer ${expiredToken}`));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("401 — user no longer exists", () => {
    it("returns 401 with USER_NOT_FOUND when userId in token has no matching DB row", async () => {
      mockFindUnique.mockResolvedValue(null);
      const token = signToken({ userId: "deleted_user" });

      const wrapped = verifyUser(successHandler);
      const res = await wrapped(makeRequest(`Bearer ${token}`));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("USER_NOT_FOUND");
      expect(successHandler).not.toHaveBeenCalled();
    });
  });
});
