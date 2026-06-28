import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskCard from "@/components/tasks/task-card";
import { renderWithProviders } from "../test-utils";
import { taskService } from "@/services/task-service";
import type { ProjectTask } from "@/types/project";

jest.mock("@/services/task-service", () => ({
  taskService: {
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
  },
}));

const mockUpdate = taskService.update as jest.Mock;
const mockDelete = taskService.delete as jest.Mock;

const baseTask: ProjectTask = {
  id: "task-1",
  title: "Fix the bug",
  description: "Detailed description",
  status: "TODO",
  priority: "HIGH",
  dueDate: null,
  projectId: "proj-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("TaskCard", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders task title", () => {
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
  });

  it("renders task description", () => {
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    expect(screen.getByText("Detailed description")).toBeInTheDocument();
  });

  it("does not render description when null", () => {
    renderWithProviders(<TaskCard task={{ ...baseTask, description: null }} projectId="proj-1" />);
    expect(screen.queryByText("Detailed description")).toBeNull();
  });

  it("renders status badge", () => {
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    expect(screen.getByText("Todo")).toBeInTheDocument();
  });

  it("renders priority badge", () => {
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("shows 'Mark In Progress' button for TODO task", () => {
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    expect(screen.getByRole("button", { name: /mark in progress/i })).toBeInTheDocument();
  });

  it("shows 'Mark Done' button for IN_PROGRESS task", () => {
    renderWithProviders(<TaskCard task={{ ...baseTask, status: "IN_PROGRESS" }} projectId="proj-1" />);
    expect(screen.getByRole("button", { name: /mark done/i })).toBeInTheDocument();
  });

  it("shows 'Reopen' button for DONE task", () => {
    renderWithProviders(<TaskCard task={{ ...baseTask, status: "DONE" }} projectId="proj-1" />);
    expect(screen.getByRole("button", { name: /reopen/i })).toBeInTheDocument();
  });

  it("applies strikethrough style for DONE task title", () => {
    renderWithProviders(<TaskCard task={{ ...baseTask, status: "DONE" }} projectId="proj-1" />);
    const title = screen.getByText("Fix the bug");
    expect(title.className).toMatch(/line-through/);
  });

  it("calls taskService.update with IN_PROGRESS when status button clicked on TODO task", async () => {
    mockUpdate.mockResolvedValue({ ...baseTask, status: "IN_PROGRESS" });
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /mark in progress/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("task-1", { status: "IN_PROGRESS" }));
  });

  it("calls taskService.update with DONE when status button clicked on IN_PROGRESS task", async () => {
    mockUpdate.mockResolvedValue({ ...baseTask, status: "DONE" });
    renderWithProviders(<TaskCard task={{ ...baseTask, status: "IN_PROGRESS" }} projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("task-1", { status: "DONE" }));
  });

  it("calls taskService.update with TODO when Reopen clicked on DONE task", async () => {
    mockUpdate.mockResolvedValue({ ...baseTask, status: "TODO" });
    renderWithProviders(<TaskCard task={{ ...baseTask, status: "DONE" }} projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /reopen/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("task-1", { status: "TODO" }));
  });

  it("calls taskService.delete when delete button clicked", async () => {
    mockDelete.mockResolvedValue({ ok: true });
    renderWithProviders(<TaskCard task={baseTask} projectId="proj-1" />);
    const deleteBtn = screen.getAllByRole("button").find((b) => b.className.includes("bg-red-600"));
    fireEvent.click(deleteBtn!);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("task-1"));
  });

  it("renders due date when present", () => {
    const future = new Date("2099-12-31");
    renderWithProviders(<TaskCard task={{ ...baseTask, dueDate: future }} projectId="proj-1" />);
    expect(screen.getByText(/Dec 31, 2099/)).toBeInTheDocument();
  });

  it("shows overdue indicator for past due date on non-DONE task", () => {
    const past = new Date("2020-01-01");
    renderWithProviders(<TaskCard task={{ ...baseTask, dueDate: past }} projectId="proj-1" />);
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it("does not show overdue for past due date on DONE task", () => {
    const past = new Date("2020-01-01");
    renderWithProviders(<TaskCard task={{ ...baseTask, status: "DONE", dueDate: past }} projectId="proj-1" />);
    expect(screen.queryByText(/overdue/i)).toBeNull();
  });

  it("does not render due date section when dueDate is null", () => {
    renderWithProviders(<TaskCard task={{ ...baseTask, dueDate: null }} projectId="proj-1" />);
    expect(screen.queryByTestId("due-date")).toBeNull();
  });
});
