import { PATCH, DELETE } from "@/app/api/tasks/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    task: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockTaskFindFirst = prisma.task.findFirst as jest.Mock;
const mockTaskUpdate = prisma.task.update as jest.Mock;
const mockTaskDelete = prisma.task.delete as jest.Mock;

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const otherUser = { ...fakeUser, id: "user_other" };

const fakeTask = {
  id: "task_1",
  title: "Fix bug",
  description: null,
  status: "TODO",
  priority: "HIGH",
  dueDate: null,
  projectId: "proj_1",
  createdAt: new Date("2024-03-01T00:00:00Z"),
  updatedAt: new Date("2024-03-01T00:00:00Z"),
};

const validToken = signToken({ userId: fakeUser.id });
const authHeader = `Bearer ${validToken}`;
const routeCtx = { params: { id: "task_1" } };

const makeRequest = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/tasks/task_1", {
    method,
    headers: { authorization: authHeader, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(fakeUser);
});

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id
// ---------------------------------------------------------------------------
describe("PATCH /api/tasks/:id", () => {
  describe("success", () => {
    it("returns 200 with the updated task", async () => {
      const updated = { ...fakeTask, title: "Fixed bug" };
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskUpdate.mockResolvedValue(updated);

      const res = await PATCH(makeRequest("PATCH", { title: "Fixed bug" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.task.title).toBe("Fixed bug");
    });

    it("can update only the status", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskUpdate.mockResolvedValue({ ...fakeTask, status: "DONE" });

      const res = await PATCH(makeRequest("PATCH", { status: "DONE" }), routeCtx);
      expect(res.status).toBe(200);
      expect(mockTaskUpdate.mock.calls[0][0].data.status).toBe("DONE");
    });

    it("can update only the priority", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskUpdate.mockResolvedValue({ ...fakeTask, priority: "LOW" });

      const res = await PATCH(makeRequest("PATCH", { priority: "LOW" }), routeCtx);
      expect(res.status).toBe(200);
      expect(mockTaskUpdate.mock.calls[0][0].data.priority).toBe("LOW");
    });

    it("stores dueDate as a Date object when provided", async () => {
      const due = "2024-12-31T00:00:00.000Z";
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskUpdate.mockResolvedValue({ ...fakeTask, dueDate: new Date(due) });

      await PATCH(makeRequest("PATCH", { dueDate: due }), routeCtx);

      const storedDate = mockTaskUpdate.mock.calls[0][0].data.dueDate;
      expect(storedDate).toBeInstanceOf(Date);
    });

    it("enforces ownership via project chain (where: { id, project: { ownerId } })", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskUpdate.mockResolvedValue(fakeTask);

      await PATCH(makeRequest("PATCH", { title: "x" }), routeCtx);

      expect(mockTaskFindFirst.mock.calls[0][0].where).toMatchObject({
        id: "task_1",
        project: { ownerId: fakeUser.id },
      });
    });

    it("calls prisma.task.update with only the provided fields", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskUpdate.mockResolvedValue(fakeTask);

      await PATCH(makeRequest("PATCH", { title: "Only title" }), routeCtx);

      expect(mockTaskUpdate.mock.calls[0][0].data).toMatchObject({ title: "Only title" });
      expect(mockTaskUpdate.mock.calls[0][0].data.priority).toBeUndefined();
    });
  });

  describe("404 — not found or wrong owner", () => {
    it("returns 404 when task does not exist", async () => {
      mockTaskFindFirst.mockResolvedValue(null);

      const res = await PATCH(makeRequest("PATCH", { title: "x" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when task belongs to a different user's project", async () => {
      mockTaskFindFirst.mockResolvedValue(null);
      mockUserFindUnique.mockResolvedValue(otherUser);

      const otherToken = signToken({ userId: otherUser.id });
      const req = new NextRequest("http://localhost/api/tasks/task_1", {
        method: "PATCH",
        headers: { authorization: `Bearer ${otherToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Stolen" }),
      });

      const res = await PATCH(req, routeCtx);
      expect(res.status).toBe(404);
    });

    it("does not call prisma.task.update when ownership check fails", async () => {
      mockTaskFindFirst.mockResolvedValue(null);

      await PATCH(makeRequest("PATCH", { title: "x" }), routeCtx);

      expect(mockTaskUpdate).not.toHaveBeenCalled();
    });
  });

  describe("400 — validation errors", () => {
    it("returns 400 when body is an empty object", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);

      const res = await PATCH(makeRequest("PATCH", {}), routeCtx);
      expect(res.status).toBe(400);
    });

    it("returns 400 when status is an invalid enum value", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);

      const res = await PATCH(makeRequest("PATCH", { status: "PENDING" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.status).toBeDefined();
    });

    it("returns 400 when priority is an invalid enum value", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);

      const res = await PATCH(makeRequest("PATCH", { priority: "CRITICAL" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.priority).toBeDefined();
    });

    it("returns 400 when dueDate is not a valid ISO datetime", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);

      const res = await PATCH(makeRequest("PATCH", { dueDate: "tomorrow" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.dueDate).toBeDefined();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/tasks/task_1", {
        method: "PATCH",
        body: JSON.stringify({ title: "x" }),
      });
      const res = await PATCH(req, routeCtx);
      expect(res.status).toBe(401);
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/tasks/:id", () => {
  describe("success", () => {
    it("returns 200 with a success message", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskDelete.mockResolvedValue(fakeTask);

      const res = await DELETE(makeRequest("DELETE"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe("Task deleted successfully");
    });

    it("calls prisma.task.delete with the correct id", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskDelete.mockResolvedValue(fakeTask);

      await DELETE(makeRequest("DELETE"), routeCtx);

      expect(mockTaskDelete.mock.calls[0][0]).toEqual({ where: { id: "task_1" } });
    });

    it("enforces ownership via project chain before deleting", async () => {
      mockTaskFindFirst.mockResolvedValue(fakeTask);
      mockTaskDelete.mockResolvedValue(fakeTask);

      await DELETE(makeRequest("DELETE"), routeCtx);

      expect(mockTaskFindFirst.mock.calls[0][0].where).toMatchObject({
        id: "task_1",
        project: { ownerId: fakeUser.id },
      });
    });
  });

  describe("404 — not found or wrong owner", () => {
    it("returns 404 when task does not exist", async () => {
      mockTaskFindFirst.mockResolvedValue(null);

      const res = await DELETE(makeRequest("DELETE"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when task belongs to a different user's project", async () => {
      mockTaskFindFirst.mockResolvedValue(null);
      mockUserFindUnique.mockResolvedValue(otherUser);

      const otherToken = signToken({ userId: otherUser.id });
      const req = new NextRequest("http://localhost/api/tasks/task_1", {
        method: "DELETE",
        headers: { authorization: `Bearer ${otherToken}` },
      });

      const res = await DELETE(req, routeCtx);
      expect(res.status).toBe(404);
    });

    it("does not call prisma.task.delete when ownership check fails", async () => {
      mockTaskFindFirst.mockResolvedValue(null);

      await DELETE(makeRequest("DELETE"), routeCtx);

      expect(mockTaskDelete).not.toHaveBeenCalled();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/tasks/task_1", { method: "DELETE" });
      const res = await DELETE(req, routeCtx);
      expect(res.status).toBe(401);
    });
  });
});
