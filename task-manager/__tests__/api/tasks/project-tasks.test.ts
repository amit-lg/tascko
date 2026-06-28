import { GET, POST } from "@/app/api/projects/[id]/tasks/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    project: { findFirst: jest.fn() },
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockProjectFindFirst = prisma.project.findFirst as jest.Mock;
const mockTaskFindMany = prisma.task.findMany as jest.Mock;
const mockTaskCreate = prisma.task.create as jest.Mock;

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const fakeProject = {
  id: "proj_1",
  name: "My Project",
  description: null,
  color: "#3b82f6",
  ownerId: fakeUser.id,
  createdAt: new Date("2024-02-01T00:00:00Z"),
};

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
const routeCtx = { params: { id: "proj_1" } };

const makeGetRequest = (search = "") =>
  new NextRequest(`http://localhost/api/projects/proj_1/tasks${search}`, {
    method: "GET",
    headers: { authorization: authHeader },
  });

const makePostRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/projects/proj_1/tasks", {
    method: "POST",
    headers: { authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(fakeUser);
  mockProjectFindFirst.mockResolvedValue(fakeProject);
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id/tasks
// ---------------------------------------------------------------------------
describe("GET /api/projects/:id/tasks", () => {
  describe("success", () => {
    it("returns 200 with all tasks for the project", async () => {
      mockTaskFindMany.mockResolvedValue([fakeTask]);

      const res = await GET(makeGetRequest(), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].id).toBe("task_1");
    });

    it("returns an empty array when project has no tasks", async () => {
      mockTaskFindMany.mockResolvedValue([]);

      const res = await GET(makeGetRequest(), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.tasks).toHaveLength(0);
    });

    it("queries tasks scoped to the projectId", async () => {
      mockTaskFindMany.mockResolvedValue([]);

      await GET(makeGetRequest(), routeCtx);

      expect(mockTaskFindMany.mock.calls[0][0].where.projectId).toBe("proj_1");
    });
  });

  describe("filtering", () => {
    it("passes status filter to prisma when status query param is provided", async () => {
      mockTaskFindMany.mockResolvedValue([]);

      await GET(makeGetRequest("?status=TODO"), routeCtx);

      expect(mockTaskFindMany.mock.calls[0][0].where.status).toBe("TODO");
    });

    it("passes priority filter to prisma when priority query param is provided", async () => {
      mockTaskFindMany.mockResolvedValue([]);

      await GET(makeGetRequest("?priority=HIGH"), routeCtx);

      expect(mockTaskFindMany.mock.calls[0][0].where.priority).toBe("HIGH");
    });

    it("applies both status and priority filters together", async () => {
      mockTaskFindMany.mockResolvedValue([]);

      await GET(makeGetRequest("?status=IN_PROGRESS&priority=MEDIUM"), routeCtx);

      const where = mockTaskFindMany.mock.calls[0][0].where;
      expect(where.status).toBe("IN_PROGRESS");
      expect(where.priority).toBe("MEDIUM");
    });

    it("does not pass status to prisma when param is omitted", async () => {
      mockTaskFindMany.mockResolvedValue([]);

      await GET(makeGetRequest(), routeCtx);

      expect(mockTaskFindMany.mock.calls[0][0].where.status).toBeUndefined();
    });

    it("returns 400 for an invalid status value", async () => {
      const res = await GET(makeGetRequest("?status=INVALID"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.status).toBeDefined();
    });

    it("returns 400 for an invalid priority value", async () => {
      const res = await GET(makeGetRequest("?priority=URGENT"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.priority).toBeDefined();
    });
  });

  describe("404 — project not found or wrong owner", () => {
    it("returns 404 when project does not exist", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      const res = await GET(makeGetRequest(), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("does not query tasks when project ownership check fails", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      await GET(makeGetRequest(), routeCtx);

      expect(mockTaskFindMany).not.toHaveBeenCalled();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/projects/proj_1/tasks", { method: "GET" });
      const res = await GET(req, routeCtx);
      expect(res.status).toBe(401);
    });
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/tasks
// ---------------------------------------------------------------------------
describe("POST /api/projects/:id/tasks", () => {
  describe("success", () => {
    it("returns 201 with the created task", async () => {
      mockTaskCreate.mockResolvedValue(fakeTask);

      const res = await POST(makePostRequest({ title: "Fix bug" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.task.id).toBe("task_1");
      expect(body.task.title).toBe("Fix bug");
    });

    it("sets projectId to the route param id", async () => {
      mockTaskCreate.mockResolvedValue(fakeTask);

      await POST(makePostRequest({ title: "Fix bug" }), routeCtx);

      expect(mockTaskCreate.mock.calls[0][0].data.projectId).toBe("proj_1");
    });

    it("defaults status to TODO when not provided", async () => {
      mockTaskCreate.mockResolvedValue(fakeTask);

      await POST(makePostRequest({ title: "Fix bug" }), routeCtx);

      expect(mockTaskCreate.mock.calls[0][0].data.status).toBe("TODO");
    });

    it("defaults priority to MEDIUM when not provided", async () => {
      mockTaskCreate.mockResolvedValue(fakeTask);

      await POST(makePostRequest({ title: "Fix bug" }), routeCtx);

      expect(mockTaskCreate.mock.calls[0][0].data.priority).toBe("MEDIUM");
    });

    it("uses the provided status and priority", async () => {
      mockTaskCreate.mockResolvedValue({ ...fakeTask, status: "IN_PROGRESS", priority: "LOW" });

      const res = await POST(
        makePostRequest({ title: "Fix bug", status: "IN_PROGRESS", priority: "LOW" }),
        routeCtx
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(mockTaskCreate.mock.calls[0][0].data.status).toBe("IN_PROGRESS");
      expect(mockTaskCreate.mock.calls[0][0].data.priority).toBe("LOW");
    });

    it("stores dueDate as a Date object when provided", async () => {
      const due = "2024-12-31T00:00:00.000Z";
      mockTaskCreate.mockResolvedValue({ ...fakeTask, dueDate: new Date(due) });

      await POST(makePostRequest({ title: "Fix bug", dueDate: due }), routeCtx);

      const storedDate = mockTaskCreate.mock.calls[0][0].data.dueDate;
      expect(storedDate).toBeInstanceOf(Date);
      expect(storedDate.toISOString()).toBe(due);
    });

    it("stores null dueDate when not provided", async () => {
      mockTaskCreate.mockResolvedValue(fakeTask);

      await POST(makePostRequest({ title: "Fix bug" }), routeCtx);

      expect(mockTaskCreate.mock.calls[0][0].data.dueDate).toBeNull();
    });
  });

  describe("400 — validation errors", () => {
    it("returns 400 when title is missing", async () => {
      const res = await POST(makePostRequest({ priority: "HIGH" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.title).toBeDefined();
    });

    it("returns 400 when title is an empty string", async () => {
      const res = await POST(makePostRequest({ title: "" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.title).toBeDefined();
    });

    it("returns 400 when status is an invalid enum value", async () => {
      const res = await POST(makePostRequest({ title: "x", status: "PENDING" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.status).toBeDefined();
    });

    it("returns 400 when priority is an invalid enum value", async () => {
      const res = await POST(makePostRequest({ title: "x", priority: "URGENT" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.priority).toBeDefined();
    });

    it("returns 400 when dueDate is not a valid ISO datetime", async () => {
      const res = await POST(makePostRequest({ title: "x", dueDate: "not-a-date" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.dueDate).toBeDefined();
    });

    it("does not call prisma.task.create on validation failure", async () => {
      await POST(makePostRequest({ title: "" }), routeCtx);
      expect(mockTaskCreate).not.toHaveBeenCalled();
    });
  });

  describe("404 — project not found or wrong owner", () => {
    it("returns 404 when project does not exist", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      const res = await POST(makePostRequest({ title: "Fix bug" }), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("does not call prisma.task.create when project ownership check fails", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      await POST(makePostRequest({ title: "Fix bug" }), routeCtx);

      expect(mockTaskCreate).not.toHaveBeenCalled();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/projects/proj_1/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "x" }),
      });
      const res = await POST(req, routeCtx);
      expect(res.status).toBe(401);
    });
  });
});
