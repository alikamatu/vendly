import type { LoginCredentials, LoginResponse, ApiError } from "@/types/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

class AuthServiceClass {
  private getHeaders(): HeadersInit {
    return { "Content-Type": "application/json" };
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_token");
  }

  setToken(token: string): void {
    localStorage.setItem("admin_token", token);
  }

  removeToken(): void {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data as ApiError;
      throw new Error(err.message?.[0] || "Login failed");
    }

    const response = data as LoginResponse;

    if (response.user.role !== "ADMIN") {
      throw new Error("Access denied. Admin credentials required.");
    }

    this.setToken(response.access_token);
    localStorage.setItem("admin_user", JSON.stringify(response.user));

    return response;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: this.getAuthHeaders(),
        });
      } catch {
        // Proceed regardless
      }
    }
    this.removeToken();
  }

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  }
}

export const AuthService = new AuthServiceClass();
