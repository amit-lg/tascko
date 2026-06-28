import { GET } from "@/app/api/auth/me/route";
import { NextRequest } from "next/server";
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
  new NextRequest("http://localhost/api/auth/me", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  describe("success", () => {
    it("returns 200 with the current user when token is valid", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      const token = signToken({ userId: fakeUser.id });

      const res = await GET(makeRequest(`Bearer ${token}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user).toEqual({
        id: fakeUser.id,
        email: fakeUser.email,
        name: fakeUser.name,
        createdAt: fakeUser.createdAt.toISOString(),
      });
    });

    it("never exposes passwordHash in the response", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      const token = signToken({ userId: fakeUser.id });

      const res = await GET(makeRequest(`Bearer ${token}`));
      const body = await res.json();

      expect(body.user.passwordHash).toBeUndefined();
    });

    it("queries the DB using select to never fetch passwordHash", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);
      const token = signToken({ userId: fakeUser.id });

      await GET(makeRequest(`Bearer ${token}`));

      const callArg = mockFindUnique.mock.calls[0][0];
      expect(callArg.select).toBeDefined();
      expect(callArg.select.passwordHash).toBeUndefined();
    });
  });

  describe("401 — auth failures delegated to verifyUser", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("MISSING_TOKEN");
    });

    it("returns 401 when token is invalid", async () => {
      const res = await GET(makeRequest("Bearer invalid.token.here"));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("INVALID_TOKEN");
    });

    it("returns 401 when user no longer exists in DB", async () => {
      mockFindUnique.mockResolvedValue(null);
      const token = signToken({ userId: "ghost_user" });

      const res = await GET(makeRequest(`Bearer ${token}`));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("USER_NOT_FOUND");
    });
  });
});
