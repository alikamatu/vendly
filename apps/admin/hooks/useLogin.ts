"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import type { LoginCredentials, AuthState } from "@/types/auth";

export function useLogin() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({ status: "idle" });

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState({ status: "loading" });
    try {
      const data = await AuthService.login(credentials);
      setState({ status: "success", data });
      // Small delay for success animation before redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setState({ status: "error", error: message });
    }
  }, [router]);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return {
    login,
    reset,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    error: state.status === "error" ? state.error : null,
  };
}
