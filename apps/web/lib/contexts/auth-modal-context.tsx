"use client";

import React, { createContext, useContext, useState } from "react";

type AuthView = "login" | "register";

interface AuthModalConfig {
  message?: string;
  onSuccess?: () => void;
}

interface AuthModalContextType {
  isOpen: boolean;
  view: AuthView;
  message?: string;
  onSuccess?: () => void;
  openLogin: (config?: AuthModalConfig) => void;
  openRegister: (config?: AuthModalConfig) => void;
  closeModal: () => void;
  setView: (view: AuthView) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(
  undefined
);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [onSuccess, setOnSuccess] = useState<(() => void) | undefined>(
    undefined
  );

  const openLogin = (config?: AuthModalConfig) => {
    setView("login");
    setMessage(config?.message);
    setOnSuccess(() => config?.onSuccess);
    setIsOpen(true);
  };

  const openRegister = (config?: AuthModalConfig) => {
    setView("register");
    setMessage(config?.message);
    setOnSuccess(() => config?.onSuccess);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    // Clear state after exit animation would be better, but simple is fine for now
  };

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        view,
        message,
        onSuccess,
        openLogin,
        openRegister,
        closeModal,
        setView,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
