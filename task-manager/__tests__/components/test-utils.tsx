import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { type AuthState } from "@/store/auth-slice";
import type { SafeUser } from "@/types/user";

export const mockUser: SafeUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  createdAt: "2024-01-01T00:00:00.000Z" as unknown as Date, // serializable for Redux in tests
};

export function makeStore(preloadedAuth?: Partial<AuthState>) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isInitialised: true,
        ...preloadedAuth,
      },
    },
  });
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

interface WrapperOptions extends RenderOptions {
  preloadedAuth?: Partial<AuthState>;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactNode,
  { preloadedAuth, queryClient, ...options }: WrapperOptions = {}
) {
  const store = makeStore(preloadedAuth);
  const qc = queryClient ?? makeQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ReduxProvider store={store}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </ReduxProvider>
    );
  }

  return { store, queryClient: qc, ...render(ui, { wrapper: Wrapper, ...options }) };
}
