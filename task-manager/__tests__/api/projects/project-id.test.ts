import { PATCH, DELETE } from "@/app/api/projects/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    project: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockProjectFindFirst = prisma.project.findFirst as jest.Mock;
const mockProjectUpdate = prisma.project.update as jest.Mock;
const mockProjectDelete = prisma.project.delete as jest.Mock;

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const otherUser = { ...fakeUser, id: "user_other" };

const fakeProject = {
  id: "proj_1",
  name: "My Project",
  description: "A test project",
  color: "#3b82f6",
  ownerId: fakeUser.id,
  createdAt: new Date("2024-02-01T00:00:00Z"),
};

const validToken = signToken({ userId: fakeUser.id });
const authHeader = `Bearer ${validToken}`;
const routeCtx = { params: { id: "proj_1" } };

const makeRequest = (method: string, body?: unknown) =>
  new NextRequest(`http://localhost/api/projects/proj_1`, {
    method,
    headers: { authorization: authHeader, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(fakeUser);
});

// ---------------------------------------------------------------------------
// PATCH /api/projects/:id
// ---------------------------------------------------------------------------
describe("PATCH /api/projects/:id", () => {
  describe("success", () => {
    it("returns 200 with the updated project", async () => {
      const updated = { ...fakeProject, name: "Updated Name" };
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectUpdate.mockResolvedValue(updated);

      const res = await PATCH(makeRequest("PATCH", { name: "Updated Name" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.project.name).toBe("Updated Name");
    });

    it("can update only the name", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectUpdate.mockResolvedValue({ ...fakeProject, name: "New Name" });

      const res = await PATCH(makeRequest("PATCH", { name: "New Name" }), routeCtx);
      expect(res.status).toBe(200);
    });

    it("can update only the description", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectUpdate.mockResolvedValue({ ...fakeProject, description: "New desc" });

      const res = await PATCH(makeRequest("PATCH", { description: "New desc" }), routeCtx);
      expect(res.status).toBe(200);
    });

    it("can update only the color", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectUpdate.mockResolvedValue({ ...fakeProject, color: "#ff0000" });

      const res = await PATCH(makeRequest("PATCH", { color: "#ff0000" }), routeCtx);
      expect(res.status).toBe(200);
    });

    it("calls prisma.project.update with only the provided fields", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectUpdate.mockResolvedValue(fakeProject);

      await PATCH(makeRequest("PATCH", { name: "Only Name" }), routeCtx);

      const updateCall = mockProjectUpdate.mock.calls[0][0];
      expect(updateCall.data).toEqual({ name: "Only Name" });
    });

    it("queries ownership using both id and ownerId", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectUpdate.mockResolvedValue(fakeProject);

      await PATCH(makeRequest("PATCH", { name: "X" }), routeCtx);

      expect(mockProjectFindFirst.mock.calls[0][0].where).toMatchObject({
        id: "proj_1",
        ownerId: fakeUser.id,
      });
    });
  });

  describe("404 — not found or wrong owner", () => {
    it("returns 404 when project does not exist", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      const res = await PATCH(makeRequest("PATCH", { name: "X" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when project belongs to a different user", async () => {
      // Simulating ownership mismatch — findFirst returns null because ownerId filter fails
      mockProjectFindFirst.mockResolvedValue(null);

      const otherToken = signToken({ userId: otherUser.id });
      const req = new NextRequest("http://localhost/api/projects/proj_1", {
        method: "PATCH",
        headers: { authorization: `Bearer ${otherToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Stolen" }),
      });
      mockUserFindUnique.mockResolvedValue(otherUser);

      const res = await PATCH(req, routeCtx);
      expect(res.status).toBe(404);
    });

    it("does not call prisma.project.update when ownership check fails", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      await PATCH(makeRequest("PATCH", { name: "X" }), routeCtx);

      expect(mockProjectUpdate).not.toHaveBeenCalled();
    });
  });

  describe("400 — validation errors", () => {
    it("returns 400 when body is empty object", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await PATCH(makeRequest("PATCH", {}), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
    });

    it("returns 400 when color is not a valid hex code", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await PATCH(makeRequest("PATCH", { color: "red" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.color).toBeDefined();
    });

    it("returns 400 when name is an empty string", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await PATCH(makeRequest("PATCH", { name: "" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.name).toBeDefined();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/projects/proj_1", {
        method: "PATCH",
        body: JSON.stringify({ name: "X" }),
      });
      const res = await PATCH(req, routeCtx);
      expect(res.status).toBe(401);
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/projects/:id", () => {
  describe("success", () => {
    it("returns 200 with a success message", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectDelete.mockResolvedValue(fakeProject);

      const res = await DELETE(makeRequest("DELETE"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe("Project deleted successfully");
    });

    it("calls prisma.project.delete with the correct id", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectDelete.mockResolvedValue(fakeProject);

      await DELETE(makeRequest("DELETE"), routeCtx);

      expect(mockProjectDelete.mock.calls[0][0]).toEqual({ where: { id: "proj_1" } });
    });

    it("queries ownership using both id and ownerId before deleting", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);
      mockProjectDelete.mockResolvedValue(fakeProject);

      await DELETE(makeRequest("DELETE"), routeCtx);

      expect(mockProjectFindFirst.mock.calls[0][0].where).toMatchObject({
        id: "proj_1",
        ownerId: fakeUser.id,
      });
    });
  });

  describe("404 — not found or wrong owner", () => {
    it("returns 404 when project does not exist", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      const res = await DELETE(makeRequest("DELETE"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when project belongs to a different user", async () => {
      mockProjectFindFirst.mockResolvedValue(null);
      const otherToken = signToken({ userId: otherUser.id });
      const req = new NextRequest("http://localhost/api/projects/proj_1", {
        method: "DELETE",
        headers: { authorization: `Bearer ${otherToken}` },
      });
      mockUserFindUnique.mockResolvedValue(otherUser);

      const res = await DELETE(req, routeCtx);
      expect(res.status).toBe(404);
    });

    it("does not call prisma.project.delete when ownership check fails", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      await DELETE(makeRequest("DELETE"), routeCtx);

      expect(mockProjectDelete).not.toHaveBeenCalled();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/projects/proj_1", {
        method: "DELETE",
      });
      const res = await DELETE(req, routeCtx);
      expect(res.status).toBe(401);
    });
  });
});
