import type { Priority, TaskStatus } from "@prisma/client";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}
