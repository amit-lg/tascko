import apiClient from "@/lib/axios-client";
import type { ProjectTask } from "@/types/project";

export interface TaskFilters {
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
}

export const taskService = {
  list: (projectId: string, filters?: TaskFilters) =>
    apiClient
      .get<{ tasks: ProjectTask[] }>(`/projects/${projectId}/tasks`, { params: filters })
      .then((r) => r.data.tasks),

  create: (projectId: string, data: CreateTaskData) =>
    apiClient
      .post<{ task: ProjectTask }>(`/projects/${projectId}/tasks`, data)
      .then((r) => r.data.task),

  update: (taskId: string, data: UpdateTaskData) =>
    apiClient.patch<{ task: ProjectTask }>(`/tasks/${taskId}`, data).then((r) => r.data.task),

  delete: (taskId: string) =>
    apiClient.delete(`/tasks/${taskId}`).then((r) => r.data),
};
