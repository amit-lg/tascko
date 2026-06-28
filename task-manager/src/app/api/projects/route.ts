import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/verify-user";
import { createProjectSchema, projectQuerySchema } from "@/schemas/project-schema";
import type { ProjectWithStats } from "@/types/project";

// POST /api/projects — create a project
export const POST = verifyUser(async (req, { currentUser }) => {
  const body = await req.json();
  const result = createProjectSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: { message: "Validation failed", issues: result.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { name, description, color } = result.data;

  const project = await prisma.project.create({
    data: {
      name,
      description: description ?? null,
      color: color ?? "#3b82f6",
      ownerId: currentUser.id,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
});

// GET /api/projects — list all projects for the current user
// Query params:
//   status  = "completed" | "incomplete"
//   sortBy  = "priority" | "newest" | "oldest"
export const GET = verifyUser(async (req, { currentUser }) => {
  const { searchParams } = new URL(req.url);

  const queryResult = projectQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: { message: "Invalid query parameters", issues: queryResult.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { status, sortBy } = queryResult.data;

  // Fetch all projects owned by the user, including task counts per status
  const projects = await prisma.project.findMany({
    where: { ownerId: currentUser.id },
    include: {
      tasks: {
        select: { status: true, priority: true },
      },
    },
    orderBy: sortBy === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
  });

  // Compute stats and apply status filter
  const withStats: ProjectWithStats[] = projects
    .map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
      const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        ownerId: p.ownerId,
        createdAt: p.createdAt,
        totalTasks,
        completedTasks,
        progress,
      };
    })
    .filter((p) => {
      if (status === "completed") return p.progress === 100 && p.totalTasks > 0;
      if (status === "incomplete") return p.progress < 100 || p.totalTasks === 0;
      return true;
    });

  // Sort by priority: HIGH projects first (most incomplete tasks of HIGH priority)
  if (sortBy === "priority") {
    withStats.sort((a, b) => {
      const highA = projects.find((p) => p.id === a.id)!.tasks.filter((t) => t.priority === "HIGH" && t.status !== "DONE").length;
      const highB = projects.find((p) => p.id === b.id)!.tasks.filter((t) => t.priority === "HIGH" && t.status !== "DONE").length;
      return highB - highA;
    });
  }

  return NextResponse.json({ projects: withStats });
});
