"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowLeft, ClipboardList } from "lucide-react";
import { projectService } from "@/services/project-service";
import { taskService, type TaskFilters } from "@/services/task-service";
import TaskCard from "@/components/tasks/task-card";
import CreateTaskModal from "@/components/tasks/create-task-modal";
import Button from "@/components/ui/button";
import Select from "@/components/ui/select";
import ProgressBar from "@/components/ui/progress-bar";
import Spinner from "@/components/ui/spinner";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.get(id),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", id, filters],
    queryFn: () => taskService.list(id, filters),
  });

  if (projectLoading) return <Spinner className="py-20" />;

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Project not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shrink-0 mt-1" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 text-sm mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
          <Button onClick={() => setTaskModalOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>

        {/* Progress */}
        <div className="mt-4 bg-white border border-gray-100 rounded-lg p-4 flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar value={project.progress} />
          </div>
          <span className="text-sm font-medium text-gray-700 w-12 text-right">
            {project.progress}%
          </span>
          <span className="text-sm text-gray-500">
            {project.completedTasks}/{project.totalTasks} done
          </span>
        </div>
      </div>

      {/* Task filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select
          className="w-40"
          placeholder="All statuses"
          value={filters.status ?? ""}
          options={[
            { value: "TODO", label: "Todo" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "DONE", label: "Done" },
          ]}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: (e.target.value as TaskFilters["status"]) || undefined }))
          }
        />
        <Select
          className="w-40"
          placeholder="All priorities"
          value={filters.priority ?? ""}
          options={[
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
          ]}
          onChange={(e) =>
            setFilters((f) => ({ ...f, priority: (e.target.value as TaskFilters["priority"]) || undefined }))
          }
        />
        {(filters.status || filters.priority) && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Task list */}
      {tasksLoading && <Spinner className="py-10" />}

      {!tasksLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filters.status || filters.priority ? "Try clearing the filters" : "Add your first task to get started"}
          </p>
          {!filters.status && !filters.priority && (
            <Button className="mt-4" onClick={() => setTaskModalOpen(true)}>
              <Plus className="w-4 h-4" /> New Task
            </Button>
          )}
        </div>
      )}

      {!tasksLoading && tasks.length > 0 && (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} projectId={id} />
          ))}
        </div>
      )}

      <CreateTaskModal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} projectId={id} />
    </>
  );
}
