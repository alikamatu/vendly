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
      className="sm:max-w-[460px]"
    >
      <div className="flex flex-col items-center text-center space-y-4 mb-2">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner mb-2">
          <Fingerprint size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
            {view === "login" ? "Welcome Back" : "Create Account"}
          </h2>
        </div>
      </div>

      <div className="mt-4">
        <AuthTabs
          defaultTab={view}
          onSuccess={handleComplete}
        />
      </div>

      <div className="mt-8 text-center">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
          Secure • SSL Encrypted • Campus Verified
        </p>
      </div>
    </Modal>
  );
}
