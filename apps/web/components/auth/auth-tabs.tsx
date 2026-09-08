'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';
import LoginForm from './login-form';
import RegisterForm from './register-form';

interface AuthTabsProps {
  defaultTab?: 'login' | 'register';
  onSuccess?: () => void;
  hideTabs?: boolean;
}

export default function AuthTabs({ defaultTab = 'login', onSuccess, hideTabs = false }: AuthTabsProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultTab);

  useEffect(() => {
    setMode(defaultTab);
  }, [defaultTab]);

  return (
    <div className="w-full">
      {!hideTabs && (
        <div className="mb-6 grid grid-cols-2 p-1 rounded-xl bg-surface border border-border select-none">
          <button
            type="button"
            className={`relative flex items-center justify-center gap-2 py-2 text-xs md:text-sm font-medium transition-colors z-10 ${
              mode === 'login' ? 'text-foreground' : 'text-foreground/50 hover:text-foreground/80'
            }`}
            onClick={() => setMode('login')}
          >
            <LogIn size={15} className="shrink-0" />
            <span>Sign in</span>
            {mode === 'login' && (
              <motion.div
                layoutId="activeAuthTab"
                className="absolute inset-0 bg-background rounded-lg -z-10 border border-border"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
          </button>
          <button
            type="button"
            className={`relative flex items-center justify-center gap-2 py-2 text-xs md:text-sm font-medium transition-colors z-10 ${
              mode === 'register' ? 'text-foreground' : 'text-foreground/50 hover:text-foreground/80'
            }`}
            onClick={() => setMode('register')}
          >
            <UserPlus size={15} className="shrink-0" />
            <span>Create account</span>
            {mode === 'register' && (
              <motion.div
                layoutId="activeAuthTab"
                className="absolute inset-0 bg-background rounded-lg -z-10 border border-border"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {mode === 'login' ? (
            <LoginForm onSuccess={onSuccess} onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSuccess={onSuccess} onSwitchToLogin={() => setMode('login')} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}