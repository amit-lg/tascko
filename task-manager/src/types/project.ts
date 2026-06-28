import type { Priority, TaskStatus } from "@prisma/client";

export interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt: Date;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  tasks: ProjectTask[];
}

export interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt: Date;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}
