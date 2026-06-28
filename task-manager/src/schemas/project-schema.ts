import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, { message: "Color must be a valid hex code (e.g. #3b82f6)" })
    .optional(),
});

export const projectQuerySchema = z.object({
  status: z.enum(["completed", "incomplete"]).optional(),
  sortBy: z.enum(["priority", "newest", "oldest"]).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
