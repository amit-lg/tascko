import { screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(app)/dashboard/page";
import { renderWithProviders, mockUser } from "../test-utils";
import { projectService } from "@/services/project-service";
import type { ProjectWithStats } from "@/types/project";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("@/services/project-service", () => ({
  projectService: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockList = projectService.list as jest.Mock;

const projects: ProjectWithStats[] = [
  {
    id: "p1",
    name: "Alpha",
    description: "First project",
    color: "#3b82f6",
    ownerId: "user-1",
    createdAt: new Date("2024-01-01"),
    totalTasks: 5,
    completedTasks: 3,
    progress: 60,
  },
  {
    id: "p2",
    name: "Beta",
    description: null,
    color: "#10b981",
    ownerId: "user-1",
    createdAt: new Date("2024-02-01"),
    totalTasks: 2,
    completedTasks: 2,
    progress: 100,
  },
];

describe("DashboardPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows spinner while loading", () => {
    mockList.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    mockList.mockRejectedValue(new Error("network error"));
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() =>
      expect(screen.getByText(/failed to load projects/i)).toBeInTheDocument()
    );
  });

  it("shows empty state when no projects exist", async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => expect(screen.getByText("No projects found")).toBeInTheDocument());
  });

  it("shows personalised greeting with user name", async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => expect(screen.getByText("Welcome, Test User")).toBeInTheDocument());
  });

  it("shows generic heading when user is null", async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: null, token: null, isInitialised: true } });
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
  });

  it("renders project cards when projects exist", async () => {
    mockList.mockResolvedValue(projects);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });

  it("opens create project modal when New Project button is clicked", async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("No projects found"));
    // The page has two "New Project" buttons (header + empty state CTA); click either
    const newProjectButtons = screen.getAllByRole("button", { name: /new project/i });
    fireEvent.click(newProjectButtons[0]);
    // Modal has its own "New Project" heading (h2)
    await waitFor(() => expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument());
  });

  it("renders status filter select with correct options", async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("No projects found"));
    expect(screen.getByRole("option", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Incomplete" })).toBeInTheDocument();
  });

  it("renders sort select with correct options", async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("No projects found"));
    expect(screen.getByRole("option", { name: "Newest first" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Oldest first" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "By priority" })).toBeInTheDocument();
  });

  it("refetches with status filter when filter is changed", async () => {
    mockList.mockResolvedValue(projects);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Alpha"));

    const statusSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusSelect, { target: { value: "completed" } });

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }))
    );
  });

  it("refetches with sortBy filter when sort is changed", async () => {
    mockList.mockResolvedValue(projects);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Alpha"));

    const sortSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(sortSelect, { target: { value: "oldest" } });

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ sortBy: "oldest" }))
    );
  });

  it("clears status filter when empty option selected", async () => {
    mockList.mockResolvedValue(projects);
    renderWithProviders(<DashboardPage />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    await waitFor(() => screen.getByText("Alpha"));

    const statusSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusSelect, { target: { value: "completed" } });
    await waitFor(() => expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" })));

    fireEvent.change(statusSelect, { target: { value: "" } });
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }))
    );
  });
});
