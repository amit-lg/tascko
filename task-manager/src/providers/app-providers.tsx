"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { useEffect, useRef } from "react";
import { authService } from "@/services/auth-service";
import { setCredentials, setInitialised } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthInitialiser({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    // Cookie is sent automatically; just validate it with the server
    authService
      .me()
      .then((user) => dispatch(setCredentials({ user, token: "" })))
      .catch(() => dispatch(setInitialised()));
  }, [dispatch]);

  return <>{children}</>;
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthInitialiser>{children}</AuthInitialiser>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
