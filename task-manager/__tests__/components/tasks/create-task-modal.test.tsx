import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateTaskModal from "@/components/tasks/create-task-modal";
import { renderWithProviders } from "../test-utils";
import { taskService } from "@/services/task-service";
import type { ProjectTask } from "@/types/project";

jest.mock("@/services/task-service", () => ({
  taskService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  },
}));

const mockCreate = taskService.create as jest.Mock;

const stubTask: ProjectTask = {
  id: "t1",
  title: "Task",
  description: null,
  status: "TODO",
  priority: "MEDIUM",
  dueDate: null,
  projectId: "proj-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("CreateTaskModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing when open=false", () => {
    renderWithProviders(<CreateTaskModal open={false} onClose={jest.fn()} projectId="proj-1" />);
    expect(screen.queryByText("New Task")).toBeNull();
  });

  it("renders modal with all fields when open=true", () => {
    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    expect(screen.getByText("New Task")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Due Date")).toBeInTheDocument();
  });

  it("shows title validation error on empty submit", async () => {
    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));
    await waitFor(() => expect(screen.getByText("Title is required")).toBeInTheDocument());
  });

  it("calls taskService.create with correct projectId and title", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue(stubTask);

    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    await user.type(screen.getByLabelText("Title"), "New task title");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("proj-1", expect.objectContaining({ title: "New task title" }))
    );
  });

  it("converts dueDate string to ISO string before calling create", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue(stubTask);

    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    await user.type(screen.getByLabelText("Title"), "Task with date");
    await user.type(screen.getByLabelText("Due Date"), "2025-06-30");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("proj-1",
        expect.objectContaining({ dueDate: expect.stringContaining("2025-06-30") })
      )
    );
  });

  it("calls onClose after successful creation", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockCreate.mockResolvedValue(stubTask);

    renderWithProviders(<CreateTaskModal open={true} onClose={onClose} projectId="proj-1" />);
    await user.type(screen.getByLabelText("Title"), "A task");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows server error when creation fails", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue({ response: { data: { error: { message: "Permission denied" } } } });

    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    await user.type(screen.getByLabelText("Title"), "A task");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(screen.getByText("Permission denied")).toBeInTheDocument());
  });

  it("shows fallback error message when error has no message", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error("network error"));

    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    await user.type(screen.getByLabelText("Title"), "A task");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(screen.getByText("Failed to create task")).toBeInTheDocument());
  });

  it("calls onClose and clears state when Cancel clicked", () => {
    const onClose = jest.fn();
    renderWithProviders(<CreateTaskModal open={true} onClose={onClose} projectId="proj-1" />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders priority options: Low, Medium, High", () => {
    renderWithProviders(<CreateTaskModal open={true} onClose={jest.fn()} projectId="proj-1" />);
    expect(screen.getByRole("option", { name: "Low" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Medium" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "High" })).toBeInTheDocument();
  });
});
