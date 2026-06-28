import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "@/app/(auth)/register/page";
import { renderWithProviders, mockUser } from "../test-utils";
import { authService } from "@/services/auth-service";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("@/services/auth-service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockRegister = authService.register as jest.Mock;

describe("RegisterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it("renders heading and subheading", () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByText("Start managing your tasks today")).toBeInTheDocument();
  });

  it("renders name, email and password fields", () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(document.querySelector("input[type='password']")).toBeInTheDocument();
  });

  it("renders Create account button", () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    renderWithProviders(<RegisterPage />);
    const link = screen.getByRole("link", { name: /log in/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("shows name required error for empty name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(screen.getByText("Name is required")).toBeInTheDocument());
  });

  it("shows email validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "bad-email");
    await user.type(document.querySelector("input[type='password']")!, "securepass");
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(screen.getByText("Invalid email address")).toBeInTheDocument());
  });

  it("shows password min-length error for short password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(document.querySelector("input[type='password']")!, "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
    );
  });

  it("calls authService.register with correct payload on valid submit", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ user: mockUser, token: "tok" });

    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(document.querySelector("input[type='password']")!, "securepass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        password: "securepass",
      })
    );
  });

  it("redirects to /dashboard on successful registration", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ user: mockUser, token: "tok" });

    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(document.querySelector("input[type='password']")!, "securepass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("stores credentials in Redux after registration", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ user: mockUser, token: "tok" });

    const { store } = renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(document.querySelector("input[type='password']")!, "securepass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(store.getState().auth.user).toEqual(mockUser));
  });

  it("shows server error for duplicate email", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue({
      response: { data: { error: { message: "Email already registered" } } },
    });

    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "taken@example.com");
    await user.type(document.querySelector("input[type='password']")!, "securepass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText("Email already registered")).toBeInTheDocument());
  });

  it("shows fallback error when error has no message", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue(new Error("network error"));

    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("Name"), "John Doe");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(document.querySelector("input[type='password']")!, "securepass");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeInTheDocument());
  });
});
