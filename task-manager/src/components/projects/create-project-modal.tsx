"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/services/project-service";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const COLOR_PRESETS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: "#3b82f6" },
  });

  const mutation = useMutation({
    mutationFn: projectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      reset();
      setSelectedColor("#3b82f6");
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to create project";
      setServerError(msg);
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError("");
    mutation.mutate({ ...data, color: selectedColor });
  };

  const handleClose = () => { reset(); setServerError(""); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="New Project">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Name" placeholder="My awesome project" error={errors.name?.message} {...register("name")} />
        <Input label="Description" placeholder="Optional description" error={errors.description?.message} {...register("description")} />

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Color</span>
          <div className="flex gap-2 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColor === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {serverError}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Create project</Button>
        </div>
      </form>
    </Modal>
  );
}
