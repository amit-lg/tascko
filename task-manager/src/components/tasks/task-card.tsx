"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Calendar } from "lucide-react";
import type { ProjectTask } from "@/types/project";
import type { TaskStatus } from "@prisma/client";
import { taskService } from "@/services/task-service";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import Button from "@/components/ui/button";

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Mark In Progress",
  IN_PROGRESS: "Mark Done",
  DONE: "Reopen",
};

interface Props {
  task: ProjectTask;
  projectId: string;
}

export default function TaskCard({ task, projectId }: Props) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (status: TaskStatus) => taskService.update(task.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskService.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const isOverdue =
    task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-medium text-gray-900 ${task.status === "DONE" ? "line-through text-gray-400" : ""}`}>
            {task.title}
          </p>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
        )}

        {dueDateStr && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
            <Calendar className="w-3 h-3" />
            {isOverdue ? "Overdue · " : ""}{dueDateStr}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          loading={updateMutation.isPending}
          onClick={() => updateMutation.mutate(STATUS_CYCLE[task.status])}
        >
          {STATUS_LABEL[task.status]}
        </Button>
        <Button
          size="sm"
          variant="danger"
          loading={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate()}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
