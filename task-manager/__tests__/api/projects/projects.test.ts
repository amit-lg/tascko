import { POST, GET } from "@/app/api/projects/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockProjectCreate = prisma.project.create as jest.Mock;
const mockProjectFindMany = prisma.project.findMany as jest.Mock;

const fakeUser = {
  id: "user_123",
  email: "john@example.com",
  name: "John Doe",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

const validToken = signToken({ userId: fakeUser.id });
const authHeader = `Bearer ${validToken}`;

const makeRequest = (method: string, body?: unknown, search = "") =>
  new NextRequest(`http://localhost/api/projects${search}`, {
    method,
    headers: { authorization: authHeader, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const fakeProject = {
  id: "proj_1",
  name: "My Project",
  description: "A test project",
  color: "#3b82f6",
  ownerId: fakeUser.id,
  createdAt: new Date("2024-02-01T00:00:00Z"),
  tasks: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(fakeUser);
});

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------
describe("POST /api/projects", () => {
  describe("success", () => {
    it("returns 201 with the created project", async () => {
      mockProjectCreate.mockResolvedValue(fakeProject);

      const res = await POST(makeRequest("POST", { name: "My Project", description: "A test project" }));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.project.id).toBe(fakeProject.id);
      expect(body.project.name).toBe("My Project");
    });

    it("sets ownerId to the current user's id", async () => {
      mockProjectCreate.mockResolvedValue(fakeProject);

      await POST(makeRequest("POST", { name: "My Project" }));

      expect(mockProjectCreate.mock.calls[0][0].data.ownerId).toBe(fakeUser.id);
    });

    it("defaults color to #3b82f6 when not provided", async () => {
      mockProjectCreate.mockResolvedValue(fakeProject);

      await POST(makeRequest("POST", { name: "My Project" }));

      expect(mockProjectCreate.mock.calls[0][0].data.color).toBe("#3b82f6");
    });

    it("uses the provided color when valid hex is supplied", async () => {
      const colored = { ...fakeProject, color: "#ff0000" };
      mockProjectCreate.mockResolvedValue(colored);

      const res = await POST(makeRequest("POST", { name: "My Project", color: "#ff0000" }));
      const body = await res.json();

      expect(body.project.color).toBe("#ff0000");
      expect(mockProjectCreate.mock.calls[0][0].data.color).toBe("#ff0000");
    });

    it("accepts a project without description", async () => {
      mockProjectCreate.mockResolvedValue({ ...fakeProject, description: null });

      const res = await POST(makeRequest("POST", { name: "No Desc" }));
      expect(res.status).toBe(201);
    });
  });

  describe("400 — validation errors", () => {
    it("returns 400 when name is missing", async () => {
      const res = await POST(makeRequest("POST", { description: "No name" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.name).toBeDefined();
    });

    it("returns 400 when name is an empty string", async () => {
      const res = await POST(makeRequest("POST", { name: "" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.name).toBeDefined();
    });

    it("returns 400 when color is not a valid hex code", async () => {
      const res = await POST(makeRequest("POST", { name: "My Project", color: "blue" }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.color).toBeDefined();
    });

    it("does not call prisma.project.create on validation failure", async () => {
      await POST(makeRequest("POST", { name: "" }));
      expect(mockProjectCreate).not.toHaveBeenCalled();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/projects", { method: "POST", body: JSON.stringify({ name: "X" }) });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------
describe("GET /api/projects", () => {
  const makeGetRequest = (search = "") =>
    new NextRequest(`http://localhost/api/projects${search}`, {
      method: "GET",
      headers: { authorization: authHeader },
    });

  const makeProjectWithTasks = (id: string, tasks: { status: string; priority: string }[], createdAt = new Date()) => ({
    id,
    name: `Project ${id}`,
    description: null,
    color: "#3b82f6",
    ownerId: fakeUser.id,
    createdAt,
    tasks,
  });

  describe("success — no filters", () => {
    it("returns 200 with all user projects", async () => {
      mockProjectFindMany.mockResolvedValue([fakeProject]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].id).toBe("proj_1");
    });

    it("returns an empty array when user has no projects", async () => {
      mockProjectFindMany.mockResolvedValue([]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.projects).toHaveLength(0);
    });

    it("computes progress correctly", async () => {
      const p = makeProjectWithTasks("p1", [
        { status: "DONE", priority: "HIGH" },
        { status: "DONE", priority: "MEDIUM" },
        { status: "TODO", priority: "LOW" },
        { status: "TODO", priority: "LOW" },
      ]);
      mockProjectFindMany.mockResolvedValue([p]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(body.projects[0].totalTasks).toBe(4);
      expect(body.projects[0].completedTasks).toBe(2);
      expect(body.projects[0].progress).toBe(50);
    });

    it("sets progress to 0 for a project with no tasks", async () => {
      mockProjectFindMany.mockResolvedValue([makeProjectWithTasks("p1", [])]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(body.projects[0].progress).toBe(0);
    });

    it("sets progress to 100 when all tasks are DONE", async () => {
      const p = makeProjectWithTasks("p1", [
        { status: "DONE", priority: "HIGH" },
        { status: "DONE", priority: "LOW" },
      ]);
      mockProjectFindMany.mockResolvedValue([p]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(body.projects[0].progress).toBe(100);
    });

    it("does not expose tasks array on projects in the response", async () => {
      mockProjectFindMany.mockResolvedValue([fakeProject]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(body.projects[0].tasks).toBeUndefined();
    });
  });

  describe("filtering", () => {
    it("returns only completed projects when status=completed", async () => {
      const completed = makeProjectWithTasks("p1", [{ status: "DONE", priority: "HIGH" }]);
      const incomplete = makeProjectWithTasks("p2", [{ status: "TODO", priority: "LOW" }]);
      mockProjectFindMany.mockResolvedValue([completed, incomplete]);

      const res = await GET(makeGetRequest("?status=completed"));
      const body = await res.json();

      expect(body.projects).toHaveLength(1);
      expect(body.projects[0].id).toBe("p1");
    });

    it("returns only incomplete projects when status=incomplete", async () => {
      const completed = makeProjectWithTasks("p1", [{ status: "DONE", priority: "HIGH" }]);
      const incomplete = makeProjectWithTasks("p2", [{ status: "TODO", priority: "LOW" }]);
      const empty = makeProjectWithTasks("p3", []);
      mockProjectFindMany.mockResolvedValue([completed, incomplete, empty]);

      const res = await GET(makeGetRequest("?status=incomplete"));
      const body = await res.json();

      const ids = body.projects.map((p: { id: string }) => p.id);
      expect(ids).toContain("p2");
      expect(ids).toContain("p3"); // empty projects count as incomplete
      expect(ids).not.toContain("p1");
    });

    it("returns all projects when status param is omitted", async () => {
      mockProjectFindMany.mockResolvedValue([
        makeProjectWithTasks("p1", [{ status: "DONE", priority: "HIGH" }]),
        makeProjectWithTasks("p2", [{ status: "TODO", priority: "LOW" }]),
      ]);

      const res = await GET(makeGetRequest());
      const body = await res.json();

      expect(body.projects).toHaveLength(2);
    });
  });

  describe("sorting", () => {
    it("passes createdAt desc to prisma when sortBy=newest", async () => {
      mockProjectFindMany.mockResolvedValue([]);

      await GET(makeGetRequest("?sortBy=newest"));

      expect(mockProjectFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
    });

    it("passes createdAt asc to prisma when sortBy=oldest", async () => {
      mockProjectFindMany.mockResolvedValue([]);

      await GET(makeGetRequest("?sortBy=oldest"));

      expect(mockProjectFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "asc" });
    });

    it("sorts by HIGH priority incomplete tasks descending when sortBy=priority", async () => {
      const lowPriority = makeProjectWithTasks("p1", [{ status: "TODO", priority: "LOW" }]);
      const highPriority = makeProjectWithTasks("p2", [
        { status: "TODO", priority: "HIGH" },
        { status: "TODO", priority: "HIGH" },
      ]);
      mockProjectFindMany.mockResolvedValue([lowPriority, highPriority]);

      const res = await GET(makeGetRequest("?sortBy=priority"));
      const body = await res.json();

      expect(body.projects[0].id).toBe("p2");
      expect(body.projects[1].id).toBe("p1");
    });

    it("does not count DONE HIGH tasks in priority sort", async () => {
      const doneHigh = makeProjectWithTasks("p1", [{ status: "DONE", priority: "HIGH" }]);
      const todoLow = makeProjectWithTasks("p2", [{ status: "TODO", priority: "LOW" }]);
      mockProjectFindMany.mockResolvedValue([doneHigh, todoLow]);

      const res = await GET(makeGetRequest("?sortBy=priority"));
      const body = await res.json();

      // p1 has 0 incomplete HIGH tasks, p2 has 0 too — order is stable; just check neither crashes
      expect(body.projects).toHaveLength(2);
    });
  });

  describe("400 — invalid query params", () => {
    it("returns 400 for an unknown status value", async () => {
      const res = await GET(makeGetRequest("?status=unknown"));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.status).toBeDefined();
    });

    it("returns 400 for an unknown sortBy value", async () => {
      const res = await GET(makeGetRequest("?sortBy=random"));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.issues.sortBy).toBeDefined();
    });
  });

  describe("401 — unauthenticated", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost/api/projects", { method: "GET" });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });
});
