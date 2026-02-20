"use client";

import React, { useState } from "react";
import { useLogin } from "../../hooks/useLogin";
import { useForm } from "../../hooks/useForm";
import { Input } from "../ui/Input";
import { Alert } from "../ui/Alert";
import { VALIDATION } from "../../constants";
import { Button } from "../ui/Button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const validationRules = {
  email: (v: string) => {
    if (!v) return "Email is required";
    if (!VALIDATION.EMAIL_REGEX.test(v)) return "Enter a valid email address";
    return null;
  },
  password: (v: string) => {
    if (!v) return "Password is required";
    if (v.length < VALIDATION.PASSWORD_MIN_LENGTH) return "Password must be at least 8 characters";
    return null;
  },
};

export function LoginForm() {
  const { login, isLoading, isSuccess, isError, error, reset } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const { values, errors, handleChange, handleBlur, validate } = useForm(
    { email: "", password: "" },
    validationRules
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await login({ email: values.email, password: values.password });
  };

  const togglePasswordVisibility = (
    <button
      type="button"
      onClick={() => setShowPassword((p) => !p)}
      className="text-[--color-foreground]/40 hover:text-[--color-primary] transition-colors focus:outline-none p-1"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {isError && error && (
        <Alert
          variant="error"
          message={error}
          onDismiss={reset}
        />
      )}

      {isSuccess && (
        <Alert
          variant="success"
          message="Login successful. Redirecting..."
        />
      )}

      <div className="space-y-6">
        <Input
          label="Email address"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          leftIcon={<Mail size={18} />}
          disabled={isLoading || isSuccess}
        />

        <Input
          label="Password"
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          leftIcon={<Lock size={18} />}
          rightElement={togglePasswordVisibility}
          disabled={isLoading || isSuccess}
        />
      </div>

      <div className="flex items-center justify-end">
        <a
          href="/forgot-password"
          className="text-xs text-[--color-foreground]/50 hover:text-[--color-primary] transition-colors duration-150"
        >
          Forgot password?
        </a>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        fullWidth
        loading={isLoading}
        disabled={isSuccess}
        className="mt-2"
      >
        {isSuccess ? "Redirecting..." : isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
