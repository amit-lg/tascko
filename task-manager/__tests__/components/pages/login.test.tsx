import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(auth)/login/page";
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
    login: jest.fn(),
    register: jest.fn(),
    me: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockLogin = authService.login as jest.Mock;

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it("renders heading and subheading", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
  });

  it("renders email and password fields", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(document.querySelector("input[type='password']")).toBeInTheDocument();
  });

  it("renders Sign in button", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    renderWithProviders(<LoginPage />);
    const link = screen.getByRole("link", { name: /register/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("shows email validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(document.querySelector("input[type='password']")!, "pass1234");
    // Submit the form directly to bypass any click timing issues
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(
      () => expect(screen.getByText("Invalid email address")).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it("shows password required error for empty password", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText("Password is required")).toBeInTheDocument());
  });

  it("calls authService.login with form values on valid submit", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ user: mockUser, token: "tok" });

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(document.querySelector("input[type='password']")!, "mypassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({ email: "user@example.com", password: "mypassword" })
    );
  });

  it("redirects to /dashboard on successful login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ user: mockUser, token: "tok" });

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(document.querySelector("input[type='password']")!, "mypassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
  });

  it("stores credentials in Redux after successful login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ user: mockUser, token: "tok" });

    const { store } = renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(document.querySelector("input[type='password']")!, "mypassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(store.getState().auth.user).toEqual(mockUser));
  });

  it("shows server error message on login failure", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({
      response: { data: { error: { message: "Invalid email or password" } } },
    });

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(document.querySelector("input[type='password']")!, "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText("Invalid email or password")).toBeInTheDocument());
  });

  it("shows fallback error message when server error has no message", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error("network error"));

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(document.querySelector("input[type='password']")!, "pass1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeInTheDocument());
  });

  it("does not redirect on failed login", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({ response: { data: { error: { message: "Bad creds" } } } });

    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(document.querySelector("input[type='password']")!, "wrongpass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => screen.getByText("Bad creds"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
