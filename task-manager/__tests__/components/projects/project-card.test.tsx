import { render, screen } from "@testing-library/react";
import ProjectCard from "@/components/projects/project-card";
import type { ProjectWithStats } from "@/types/project";

jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const base: ProjectWithStats = {
  id: "proj-1",
  name: "My Project",
  description: "A test project",
  color: "#3b82f6",
  ownerId: "user-1",
  createdAt: new Date("2024-01-01"),
  totalTasks: 4,
  completedTasks: 2,
  progress: 50,
};

describe("ProjectCard", () => {
  it("renders the project name", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("My Project")).toBeInTheDocument();
  });

  it("renders the project description", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("A test project")).toBeInTheDocument();
  });

  it("omits description element when description is null", () => {
    render(<ProjectCard project={{ ...base, description: null }} />);
    expect(screen.queryByText("A test project")).toBeNull();
  });

  it("renders task count", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("4 tasks")).toBeInTheDocument();
  });

  it("renders singular 'task' for 1 task", () => {
    render(<ProjectCard project={{ ...base, totalTasks: 1 }} />);
    expect(screen.getByText("1 task")).toBeInTheDocument();
  });

  it("renders progress percentage", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows 'Pending' badge when progress < 100", () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows 'Complete' badge when progress is 100 and has tasks", () => {
    render(<ProjectCard project={{ ...base, progress: 100, completedTasks: 4, totalTasks: 4 }} />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("shows 'Pending' badge for 100% progress but 0 tasks", () => {
    render(<ProjectCard project={{ ...base, progress: 100, totalTasks: 0, completedTasks: 0 }} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("links to the project detail page", () => {
    render(<ProjectCard project={base} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/proj-1");
  });

  it("applies the project color to the color dot", () => {
    const { container } = render(<ProjectCard project={base} />);
    const dot = container.querySelector("[style*='background-color']");
    expect(dot).toBeInTheDocument();
    expect((dot as HTMLElement).style.backgroundColor).toBe("rgb(59, 130, 246)");
  });
});
