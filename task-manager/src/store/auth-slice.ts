"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SafeUser } from "@/types/user";

interface AuthState {
  user: SafeUser | null;
  token: string | null;
  isInitialised: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isInitialised: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: SafeUser; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isInitialised = true;
    },
    clearCredentials(state) {
      state.user = null;
      state.token = null;
      state.isInitialised = true;
    },
    setInitialised(state) {
      state.isInitialised = true;
    },
  },
});

export const { setCredentials, clearCredentials, setInitialised } = authSlice.actions;
export default authSlice.reducer;
