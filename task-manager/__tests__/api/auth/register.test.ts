import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  passwordHash: "$2a$12$hashedpassword",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  describe("success", () => {
    it("returns 201 with user (no passwordHash) and a valid JWT token", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(201);
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
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123", name: "John Doe" }));
      const body = await res.json();

      expect(body.user.passwordHash).toBeUndefined();
    });

    it("returns a JWT token that encodes the correct userId", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123", name: "John Doe" }));
      const { token } = await res.json();

      const payload = verifyToken(token);
      expect(payload.userId).toBe(fakeUser.id);
    });

    it("calls prisma.user.create with a hashed password, not plaintext", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue(fakeUser);

      await POST(makeRequest({ email: "john@example.com", password: "password123", name: "John Doe" }));

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe("password123");
      expect(createCall.data.password).toBeUndefined();
    });

    it("trims email casing is preserved and stored as-is", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ ...fakeUser, email: "John@Example.com" });

      const res = await POST(makeRequest({ email: "John@Example.com", password: "password123", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.user.email).toBe("John@Example.com");
    });
  });

  describe("409 — duplicate email", () => {
    it("returns 409 when email is already registered", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);

      const res = await POST(makeRequest({ email: "john@example.com", password: "password123", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.error.message).toBe("Email already registered");
      expect(body.error.code).toBe("EMAIL_TAKEN");
    });

    it("does not call prisma.user.create when email is taken", async () => {
      mockFindUnique.mockResolvedValue(fakeUser);

      await POST(makeRequest({ email: "john@example.com", password: "password123", name: "John Doe" }));

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("400 — validation errors", () => {
    it("returns 400 when email is missing", async () => {
      const res = await POST(makeRequest({ password: "password123", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.message).toBe("Validation failed");
      expect(body.error.issues.email).toBeDefined();
    });

    it("returns 400 when email is invalid format", async () => {
      const res = await POST(makeRequest({ email: "not-an-email", password: "password123", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.email).toBeDefined();
    });

    it("returns 400 when password is missing", async () => {
      const res = await POST(makeRequest({ email: "john@example.com", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.password).toBeDefined();
    });

    it("returns 400 when password is shorter than 8 characters", async () => {
      const res = await POST(makeRequest({ email: "john@example.com", password: "short", name: "John Doe" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.password).toBeDefined();
    });

    it("returns 400 when name is missing", async () => {
      const res = await POST(makeRequest({ email: "john@example.com", password: "password123" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.name).toBeDefined();
    });

    it("returns 400 when name is an empty string", async () => {
      const res = await POST(makeRequest({ email: "john@example.com", password: "password123", name: "" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.name).toBeDefined();
    });

    it("returns 400 when all fields are missing", async () => {
      const res = await POST(makeRequest({}));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.email).toBeDefined();
      expect(body.error.issues.password).toBeDefined();
      expect(body.error.issues.name).toBeDefined();
    });

    it("returns 400 when body is not valid JSON types (numbers instead of strings)", async () => {
      const res = await POST(makeRequest({ email: 123, password: 456, name: 789 }));
      const body = await res.json();

      expect(res.status).toBe(400);
    });

    it("does not call prisma on validation failure", async () => {
      await POST(makeRequest({ email: "bad", password: "123", name: "" }));

      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
