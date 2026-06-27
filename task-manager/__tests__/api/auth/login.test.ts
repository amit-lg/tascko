import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { verifyToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let fakeUser: { id: string; email: string; name: string; passwordHash: string; createdAt: Date };

beforeAll(async () => {
  fakeUser = {
    id: "user_123",
    email: "john@example.com",
    name: "John Doe",
    passwordHash: await hashPassword("password123"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  describe("success", () => {
    it("returns 200 with user (no passwordHash) and a valid JWT token", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user).toEqual({
        id: fakeUser.id,
        email: fakeUser.email,
        name: fakeUser.name,
        createdAt: fakeUser.createdAt.toISOString(),
      });
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe("string");
    });

    it("never exposes passwordHash in the response", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123" }));
      const body = await res.json();

      expect(body.user.passwordHash).toBeUndefined();
    });

    it("returns a JWT token that encodes the correct userId", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123" }));
      const { token } = await res.json();

      const payload = verifyToken(token);
      expect(payload.userId).toBe(fakeUser.id);
    });
  });

  describe("401 — invalid credentials", () => {
    it("returns 401 when email does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      const res = await POST(makeRequest({ email: "nobody@example.com", password: "password123" }));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.message).toBe("Invalid email or password");
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 401 when password is incorrect", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "wrongpassword" }));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.message).toBe("Invalid email or password");
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns the same error message for wrong email and wrong password (no user enumeration)", async () => {
      mockFindUnique.mockResolvedValue(null);
      const resNoUser = await POST(makeRequest({ email: "nobody@example.com", password: "password123" }));
      const bodyNoUser = await resNoUser.json();

      mockFindUnique.mockResolvedValue(fakeUser);
      const resWrongPass = await POST(makeRequest({ email: "john@example.com", password: "wrongpassword" }));
      const bodyWrongPass = await resWrongPass.json();

      expect(bodyNoUser.error.message).toBe(bodyWrongPass.error.message);
    });
  });

  describe("400 — validation errors", () => {
    it("returns 400 when email is missing", async () => {
      const res = await POST(makeRequest({ password: "password123" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.message).toBe("Validation failed");
      expect(body.error.issues.email).toBeDefined();
    });

    it("returns 400 when email is invalid format", async () => {
      const res = await POST(makeRequest({ email: "not-an-email", password: "password123" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.email).toBeDefined();
    });

    it("returns 400 when password is missing", async () => {
      const res = await POST(makeRequest({ email: "john@example.com" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.password).toBeDefined();
    });

    it("returns 400 when password is an empty string", async () => {
      const res = await POST(makeRequest({ email: "john@example.com", password: "" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.password).toBeDefined();
    });

    it("returns 400 when both fields are missing", async () => {
      const res = await POST(makeRequest({}));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.email).toBeDefined();
      expect(body.error.issues.password).toBeDefined();
    });

    it("does not call prisma on validation failure", async () => {
      await POST(makeRequest({ email: "bad", password: "" }));

      expect(mockFindUnique).not.toHaveBeenCalled();
    });
  });
});
