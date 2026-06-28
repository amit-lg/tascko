"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FolderOpen } from "lucide-react";
import { projectService, type ProjectFilters } from "@/services/project-service";
import ProjectCard from "@/components/projects/project-card";
import CreateProjectModal from "@/components/projects/create-project-modal";
import Button from "@/components/ui/button";
import Select from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import { useAppSelector } from "@/store/hooks";

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({ sortBy: "newest" });

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ["projects", filters],
    queryFn: () => projectService.list(filters),
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {user ? `Welcome, ${user.name}` : "Dashboard"}
          </h1>
          <p className="text-gray-600 text-sm mt-0.5">Manage your projects</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Select
          className="w-40"
          placeholder="All statuses"
          value={filters.status ?? ""}
          options={[
            { value: "completed", label: "Completed" },
            { value: "incomplete", label: "Incomplete" },
          ]}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: (e.target.value as ProjectFilters["status"]) || undefined }))
          }
        />
        <Select
          className="w-40"
          value={filters.sortBy ?? "newest"}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "priority", label: "By priority" },
          ]}
          onChange={(e) =>
            setFilters((f) => ({ ...f, sortBy: e.target.value as ProjectFilters["sortBy"] }))
          }
        />
      </div>

      {isLoading && <Spinner className="py-20" />}

      {isError && (
        <p className="text-center text-red-600 py-20">Failed to load projects. Please try again.</p>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No projects found</p>
          <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
          <Button className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
