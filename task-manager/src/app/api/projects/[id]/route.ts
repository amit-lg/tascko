import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/verify-user";
import { updateProjectSchema } from "@/schemas/project-schema";
import type { ProjectDetail } from "@/types/project";

type RouteContext = { params: { id: string } };

// GET /api/projects/:id — fetch a single project with its tasks and progress (owner only)
export const GET = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (_request, { currentUser }) => {
    const { id } = ctx.params;

    const project = await prisma.project.findFirst({
      where: { id, ownerId: currentUser.id },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const detail: ProjectDetail = {
      id: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      totalTasks,
      completedTasks,
      progress,
      tasks: project.tasks,
    };

    return NextResponse.json({ project: detail });
  })(req);

// PATCH /api/projects/:id — update a project (owner only)
export const PATCH = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (request, { currentUser }) => {
    const { id } = ctx.params;

    const existing = await prisma.project.findFirst({
      where: { id, ownerId: currentUser.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: { message: "Validation failed", issues: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const updated = await prisma.project.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json({ project: updated });
  })(req);

// DELETE /api/projects/:id — delete a project and its tasks (owner only)
export const DELETE = (req: NextRequest, ctx: RouteContext) =>
  verifyUser(async (_request, { currentUser }) => {
    const { id } = ctx.params;

    const existing = await prisma.project.findFirst({
      where: { id, ownerId: currentUser.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { message: "Project not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ message: "Project deleted successfully" });
  })(req);
