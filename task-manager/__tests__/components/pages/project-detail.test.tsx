import { screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectDetailPage from "@/app/(app)/projects/[id]/page";
import { renderWithProviders, mockUser } from "../test-utils";
import { projectService } from "@/services/project-service";
import { taskService } from "@/services/task-service";
import type { ProjectDetail } from "@/types/project";
import type { ProjectTask } from "@/types/project";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "proj-1" }),
}));

jest.mock("@/services/project-service", () => ({
  projectService: {
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/services/task-service", () => ({
  taskService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockGet = projectService.get as jest.Mock;
const mockTaskList = taskService.list as jest.Mock;
const mockTaskUpdate = taskService.update as jest.Mock;
const mockTaskDelete = taskService.delete as jest.Mock;

const project: ProjectDetail = {
  id: "proj-1",
  name: "Test Project",
  description: "Project description",
  color: "#3b82f6",
  ownerId: "user-1",
  createdAt: new Date("2024-01-01"),
  totalTasks: 2,
  completedTasks: 1,
  progress: 50,
  tasks: [],
};

const tasks: ProjectTask[] = [
  {
    id: "t1",
    title: "First task",
    description: "Do this",
    status: "TODO",
    priority: "HIGH",
    dueDate: null,
    projectId: "proj-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "t2",
    title: "Second task",
    description: null,
    status: "DONE",
    priority: "LOW",
    dueDate: null,
    projectId: "proj-1",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
];

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it("shows spinner while project is loading", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows project not found when project is undefined", async () => {
    mockGet.mockResolvedValue(undefined);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => expect(screen.getByText("Project not found.")).toBeInTheDocument());
  });

  it("navigates to dashboard when back button clicked on not found", async () => {
    mockGet.mockResolvedValue(undefined);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Project not found."));
    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("renders project name and description", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => expect(screen.getByText("Test Project")).toBeInTheDocument());
    expect(screen.getByText("Project description")).toBeInTheDocument();
  });

  it("renders progress bar with correct percentage", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Test Project"));
    // Progress renders as adjacent text nodes "50" + "%" so use getByText with exact:false
    expect(screen.getByText(/50\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/1\s*\/\s*2\s*done/)).toBeInTheDocument();
  });

  it("renders task cards for each task", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue(tasks);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => {
      expect(screen.getByText("First task")).toBeInTheDocument();
      expect(screen.getByText("Second task")).toBeInTheDocument();
    });
  });

  it("shows empty state when task list is empty", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => expect(screen.getByText("No tasks found")).toBeInTheDocument());
  });

  it("opens create task modal when New Task button clicked", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Test Project"));
    // Two "New Task" buttons exist (header + empty-state CTA); click the first (header)
    fireEvent.click(screen.getAllByRole("button", { name: /new task/i })[0]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "New Task" })).toBeInTheDocument());
  });

  it("navigates to dashboard when back link clicked", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Test Project"));
    fireEvent.click(screen.getByText("Dashboard"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("renders status filter with correct options", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Test Project"));
    expect(screen.getByRole("option", { name: "Todo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Done" })).toBeInTheDocument();
  });

  it("renders priority filter with correct options", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Test Project"));
    expect(screen.getByRole("option", { name: "Low" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Medium" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "High" })).toBeInTheDocument();
  });

  it("refetches tasks with status filter when filter applied", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue(tasks);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("First task"));

    const statusSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusSelect, { target: { value: "TODO" } });

    await waitFor(() =>
      expect(mockTaskList).toHaveBeenCalledWith("proj-1", expect.objectContaining({ status: "TODO" }))
    );
  });

  it("refetches tasks with priority filter when filter applied", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue(tasks);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("First task"));

    const prioritySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(prioritySelect, { target: { value: "HIGH" } });

    await waitFor(() =>
      expect(mockTaskList).toHaveBeenCalledWith("proj-1", expect.objectContaining({ priority: "HIGH" }))
    );
  });

  it("shows 'Clear filters' button when a filter is active", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue(tasks);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("First task"));

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "TODO" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument());
  });

  it("clears filters when 'Clear filters' clicked", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue(tasks);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("First task"));

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "TODO" } });
    await waitFor(() => screen.getByRole("button", { name: /clear filters/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    // After clearing, "Clear filters" button disappears (filters reset)
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /clear filters/i })).toBeNull()
    );
  });

  it("shows filter hint text when tasks empty and filter is active", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([]);
    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("No tasks found"));

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "TODO" } });
    await waitFor(() => expect(screen.getByText("Try clearing the filters")).toBeInTheDocument());
  });

  it("calls taskService.update when task status button clicked", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([tasks[0]]);
    mockTaskUpdate.mockResolvedValue({ ...tasks[0], status: "IN_PROGRESS" });

    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("First task"));

    fireEvent.click(screen.getByRole("button", { name: /mark in progress/i }));
    await waitFor(() =>
      expect(mockTaskUpdate).toHaveBeenCalledWith("t1", { status: "IN_PROGRESS" })
    );
  });

  it("calls taskService.delete when delete button clicked", async () => {
    mockGet.mockResolvedValue(project);
    mockTaskList.mockResolvedValue([tasks[0]]);
    mockTaskDelete.mockResolvedValue({ ok: true });

    renderWithProviders(<ProjectDetailPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("First task"));

    const deleteBtn = document.querySelector("button.bg-red-600");
    fireEvent.click(deleteBtn!);
    await waitFor(() => expect(mockTaskDelete).toHaveBeenCalledWith("t1"));
  });
});
