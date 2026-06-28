"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/services/task-service";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import { useState } from "react";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : (v as "LOW" | "MEDIUM" | "HIGH"))),
  dueDate: z.string().optional(),
});

type FormData = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export default function CreateTaskModal({ open, onClose, projectId }: Props) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormOutput) =>
      taskService.create(projectId, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to create task";
      setServerError(msg);
    },
  });

  const handleClose = () => { reset(); setServerError(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="New Task">
      <form onSubmit={handleSubmit((d) => { setServerError(""); mutation.mutate(d as FormOutput); })} className="flex flex-col gap-4">
        <Input label="Title" placeholder="What needs to be done?" error={errors.title?.message} {...register("title")} />
        <Input label="Description" placeholder="Optional details" error={errors.description?.message} {...register("description")} />
        <Select
          label="Priority"
          options={[
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
          ]}
          placeholder="Select priority"
          error={errors.priority?.message}
          {...register("priority")}
        />
        <Input label="Due Date" type="date" error={errors.dueDate?.message} {...register("dueDate")} />

        {serverError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {serverError}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create task</Button>
        </div>
      </form>
    </Modal>
  );
}
