import apiClient from "@/lib/axios-client";
import type { ProjectWithStats, ProjectDetail } from "@/types/project";

export interface ProjectFilters {
  status?: "completed" | "incomplete";
  sortBy?: "newest" | "oldest" | "priority";
}

export interface CreateProjectData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  color?: string;
}

export const projectService = {
  list: (filters?: ProjectFilters) =>
    apiClient
      .get<{ projects: ProjectWithStats[] }>("/projects", { params: filters })
      .then((r) => r.data.projects),

  get: (id: string) =>
    apiClient.get<{ project: ProjectDetail }>(`/projects/${id}`).then((r) => r.data.project),

  create: (data: CreateProjectData) =>
    apiClient.post<{ project: ProjectWithStats }>("/projects", data).then((r) => r.data.project),

  update: (id: string, data: UpdateProjectData) =>
    apiClient.patch<{ project: ProjectWithStats }>(`/projects/${id}`, data).then((r) => r.data.project),

  delete: (id: string) =>
    apiClient.delete(`/projects/${id}`).then((r) => r.data),
};
