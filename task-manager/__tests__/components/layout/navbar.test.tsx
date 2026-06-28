import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Navbar from "@/components/layout/navbar";
import { renderWithProviders, mockUser } from "../test-utils";
import { authService } from "@/services/auth-service";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/services/auth-service", () => ({
  authService: {
    logout: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    me: jest.fn(),
  },
}));

const mockLogout = authService.logout as jest.Mock;

describe("Navbar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the app name", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByText("TaskManager")).toBeInTheDocument();
  });

  it("renders Logout button", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("shows user name when authenticated", () => {
    renderWithProviders(<Navbar />, { preloadedAuth: { user: mockUser, token: "t", isInitialised: true } });
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("does not show user name when not authenticated", () => {
    renderWithProviders(<Navbar />, { preloadedAuth: { user: null, token: null, isInitialised: true } });
    expect(screen.queryByText("Test User")).toBeNull();
  });

  it("calls authService.logout when Logout clicked", async () => {
    mockLogout.mockResolvedValue({ ok: true });
    renderWithProviders(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it("clears redux auth state after logout", async () => {
    mockLogout.mockResolvedValue({ ok: true });
    const { store } = renderWithProviders(<Navbar />, {
      preloadedAuth: { user: mockUser, token: "tok", isInitialised: true },
    });
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => expect(store.getState().auth.user).toBeNull());
  });

  it("clears auth and redirects even when logout API succeeds", async () => {
    mockLogout.mockResolvedValue({ ok: true });
    const { store } = renderWithProviders(<Navbar />, {
      preloadedAuth: { user: mockUser, token: "tok", isInitialised: true },
    });
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().auth.token).toBeNull();
    });
  });
});
