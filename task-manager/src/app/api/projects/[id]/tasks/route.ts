import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/verify-user";
import { createTaskSchema, taskQuerySchema } from "@/schemas/task-schema";

type RouteContext = { params: { id: string } };

// GET /api/projects/:id/tasks — list tasks for a project (owner only)
// Query params:
//   status   = "TODO" | "IN_PROGRESS" | "DONE"
//   priority = "LOW"  | "MEDIUM"      | "HIGH"
export const GET = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (_request, { currentUser }) => {
    const { id: projectId } = ctx.params;

    // Verify project exists and belongs to the current user
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: currentUser.id },
    });

    if (!project) {
      return NextResponse.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);

    const queryResult = taskQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: { message: "Invalid query parameters", issues: queryResult.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { status, priority } = queryResult.data;

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tasks });
  })(req);

// POST /api/projects/:id/tasks — create a task under a project (owner only)
export const POST = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (request, { currentUser }) => {
    const { id: projectId } = ctx.params;

    // Verify project exists and belongs to the current user
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: currentUser.id },
    });

    if (!project) {
      return NextResponse.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", issues: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { title, description, status, priority, dueDate } = result.data;

    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        status: status ?? "TODO",
        priority: priority ?? "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  })(req);
