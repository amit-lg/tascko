import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProjectModal from "@/components/projects/create-project-modal";
import { renderWithProviders } from "../test-utils";
import { projectService } from "@/services/project-service";

jest.mock("@/services/project-service", () => ({
  projectService: {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockCreate = projectService.create as jest.Mock;

describe("CreateProjectModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing when open=false", () => {
    renderWithProviders(<CreateProjectModal open={false} onClose={jest.fn()} />);
    expect(screen.queryByText("New Project")).toBeNull();
  });

  it("renders modal content when open=true", () => {
    renderWithProviders(<CreateProjectModal open={true} onClose={jest.fn()} />);
    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("renders 6 color preset buttons", () => {
    renderWithProviders(<CreateProjectModal open={true} onClose={jest.fn()} />);
    const colorButtons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("type") === "button" && b.className.includes("rounded-full") && !b.textContent);
    expect(colorButtons).toHaveLength(6);
  });

  it("shows name validation error when submitted empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateProjectModal open={true} onClose={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: /create project/i }));
    await waitFor(() => expect(screen.getByText("Name is required")).toBeInTheDocument());
  });

  it("calls projectService.create with correct payload on valid submit", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockCreate.mockResolvedValue({ id: "p1", name: "Test", description: "", color: "#3b82f6", ownerId: "u1", createdAt: new Date(), totalTasks: 0, completedTasks: 0, progress: 0 });

    renderWithProviders(<CreateProjectModal open={true} onClose={onClose} />);

    await user.type(screen.getByLabelText("Name"), "Test Project");
    await user.type(screen.getByLabelText("Description"), "A description");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test Project", description: "A description" }),
        expect.anything()  // TanStack Query passes mutation options as second arg
      )
    );
  });

  it("calls onClose after successful creation", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockCreate.mockResolvedValue({ id: "p1", name: "X", description: null, color: "#3b82f6", ownerId: "u1", createdAt: new Date(), totalTasks: 0, completedTasks: 0, progress: 0 });

    renderWithProviders(<CreateProjectModal open={true} onClose={onClose} />);
    await user.type(screen.getByLabelText("Name"), "Test");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("shows server error when creation fails", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue({
      response: { data: { error: { message: "Something went wrong" } } },
    });

    renderWithProviders(<CreateProjectModal open={true} onClose={jest.fn()} />);
    await user.type(screen.getByLabelText("Name"), "Bad Project");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeInTheDocument());
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = jest.fn();
    renderWithProviders(<CreateProjectModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears form and error on close", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue({ response: { data: { error: { message: "Error" } } } });

    const { rerender } = renderWithProviders(<CreateProjectModal open={true} onClose={jest.fn()} />);
    await user.type(screen.getByLabelText("Name"), "Test");
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(screen.getByText("Error")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    rerender(<CreateProjectModal open={true} onClose={jest.fn()} />);
    expect(screen.queryByText("Error")).toBeNull();
  });
});
