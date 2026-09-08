"use client";

import React from "react";
import Modal from "../ui/Modal";
import { useAuthModal } from "@/lib/contexts/auth-modal-context";
import AuthTabs from "./auth-tabs";
import { Fingerprint } from "lucide-react";
import Alert from "../ui/Alert";

export default function AuthModal() {
  const { isOpen, view, closeModal, message, onSuccess } = useAuthModal();

  const handleComplete = () => {
    closeModal();
    if (onSuccess) onSuccess();
  };

  // For registration, we don't automatically close so the user can see the "Verify Email" instructions.
  // We'll let the success screen handle closing.

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      className="sm:max-w-[440px]"
    >
      <div className="flex flex-col items-center text-center space-y-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shadow-xs">
          <Fingerprint size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {view === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
            {view === "login"
              ? "Sign in to access your store and checkout faster."
              : "Join Verndly to shop from verified young entrepreneurs or launch your store."}
          </p>
        </div>
      </div>

      {message && (
        <Alert variant="info" message={message} className="mb-4" />
      )}

      <div>
        <AuthTabs
          defaultTab={view}
          onSuccess={handleComplete}
        />
      </div>

      <div className="mt-6 pt-2 text-center">
        <p className="text-[10px] text-foreground/40 font-medium">
          256-bit SSL Encrypted • Verndly Verified Platform
        </p>
      </div>
    </Modal>
  );
}
