import { GET } from "@/app/api/projects/[id]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    project: { findFirst: jest.fn() },
  },
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockProjectFindFirst = prisma.project.findFirst as jest.Mock;

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const otherUser = { ...fakeUser, id: "user_other" };

const fakeTasks = [
  { id: "t1", title: "Task 1", description: null, status: "DONE",        priority: "HIGH",   dueDate: null, projectId: "proj_1", createdAt: new Date("2024-03-02"), updatedAt: new Date() },
  { id: "t2", title: "Task 2", description: "desc", status: "TODO",      priority: "MEDIUM", dueDate: null, projectId: "proj_1", createdAt: new Date("2024-03-01"), updatedAt: new Date() },
  { id: "t3", title: "Task 3", description: null, status: "IN_PROGRESS", priority: "LOW",    dueDate: null, projectId: "proj_1", createdAt: new Date("2024-03-03"), updatedAt: new Date() },
];

const fakeProject = {
  id: "proj_1",
  name: "My Project",
  description: "A test project",
  color: "#3b82f6",
  ownerId: fakeUser.id,
  createdAt: new Date("2024-02-01T00:00:00Z"),
  tasks: fakeTasks,
};

const validToken = signToken({ userId: fakeUser.id });
const routeCtx = { params: { id: "proj_1" } };

const makeRequest = (authHeader?: string) =>
  new NextRequest("http://localhost/api/projects/proj_1", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(fakeUser);
});

describe("GET /api/projects/:id", () => {
  describe("success", () => {
    it("returns 200 with the project and its tasks", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.project.id).toBe("proj_1");
      expect(body.project.name).toBe("My Project");
      expect(body.project.tasks).toHaveLength(3);
    });

    it("includes all task fields in the response", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      const task = body.project.tasks[0];
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.status).toBeDefined();
      expect(task.priority).toBeDefined();
    });

    it("computes totalTasks correctly", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      expect(body.project.totalTasks).toBe(3);
    });

    it("computes completedTasks correctly (only DONE tasks)", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      expect(body.project.completedTasks).toBe(1);
    });

    it("computes progress as a rounded percentage", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      // 1 of 3 done = 33%
      expect(body.project.progress).toBe(33);
    });

    it("returns progress 0 when project has no tasks", async () => {
      mockProjectFindFirst.mockResolvedValue({ ...fakeProject, tasks: [] });

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      expect(body.project.progress).toBe(0);
      expect(body.project.totalTasks).toBe(0);
      expect(body.project.completedTasks).toBe(0);
    });

    it("returns progress 100 when all tasks are DONE", async () => {
      const allDone = fakeTasks.map((t) => ({ ...t, status: "DONE" }));
      mockProjectFindFirst.mockResolvedValue({ ...fakeProject, tasks: allDone });

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      expect(body.project.progress).toBe(100);
    });

    it("queries ownership using both id and ownerId", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      await GET(makeRequest(`Bearer ${validToken}`), routeCtx);

      expect(mockProjectFindFirst.mock.calls[0][0].where).toMatchObject({
        id: "proj_1",
        ownerId: fakeUser.id,
      });
    });

    it("includes tasks via include in the prisma query", async () => {
      mockProjectFindFirst.mockResolvedValue(fakeProject);

      await GET(makeRequest(`Bearer ${validToken}`), routeCtx);

      expect(mockProjectFindFirst.mock.calls[0][0].include).toBeDefined();
      expect(mockProjectFindFirst.mock.calls[0][0].include.tasks).toBeDefined();
    });
  });

  describe("404 — not found or wrong owner", () => {
    it("returns 404 when project does not exist", async () => {
      mockProjectFindFirst.mockResolvedValue(null);

      const res = await GET(makeRequest(`Bearer ${validToken}`), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 when project belongs to a different user", async () => {
      // findFirst returns null because ownerId filter excludes the other user
      mockProjectFindFirst.mockResolvedValue(null);
      mockUserFindUnique.mockResolvedValue(otherUser);

      const otherToken = signToken({ userId: otherUser.id });
      const req = new NextRequest("http://localhost/api/projects/proj_1", {
        method: "GET",
        headers: { authorization: `Bearer ${otherToken}` },
      });

      const res = await GET(req, routeCtx);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const res = await GET(makeRequest(), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("MISSING_TOKEN");
    });

    it("returns 401 when token is invalid", async () => {
      const res = await GET(makeRequest("Bearer invalid.token"), routeCtx);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("INVALID_TOKEN");
    });
  });
});
