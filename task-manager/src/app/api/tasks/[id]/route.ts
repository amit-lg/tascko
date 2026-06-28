import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/verify-user";
import { updateTaskSchema } from "@/schemas/task-schema";

type RouteContext = { params: { id: string } };

// PATCH /api/tasks/:id — update a task (owner via project chain)
export const PATCH = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (request, { currentUser }) => {
    const { id } = ctx.params;

    // Ownership: task → project → ownerId must match current user
    const task = await prisma.task.findFirst({
      where: { id, project: { ownerId: currentUser.id } },
    });

    if (!task) {
      return NextResponse.json(
        { error: { message: "Task not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", issues: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { dueDate, ...rest } = result.data;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
      },
    });

    return NextResponse.json({ task: updated });
  })(req);

// DELETE /api/tasks/:id — delete a task (owner via project chain)
export const DELETE = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (_request, { currentUser }) => {
    const { id } = ctx.params;

    // Ownership: task → project → ownerId must match current user
    const task = await prisma.task.findFirst({
      where: { id, project: { ownerId: currentUser.id } },
    });

    if (!task) {
      return NextResponse.json(
        { error: { message: "Task not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ message: "Task deleted successfully" });
  })(req);
