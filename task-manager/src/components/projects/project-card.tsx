"use client";

import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import type { ProjectWithStats } from "@/types/project";
import Card from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";

export default function ProjectCard({ project }: { project: ProjectWithStats }) {
  const isComplete = project.progress === 100 && project.totalTasks > 0;

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-100 h-full">
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: project.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 justify-between">
              <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
              {isComplete ? (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Complete
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full shrink-0">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{project.totalTasks} task{project.totalTasks !== 1 ? "s" : ""}</span>
                <span className="font-medium text-gray-700">{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
