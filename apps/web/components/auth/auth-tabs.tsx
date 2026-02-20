'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LoginForm from './login-form';
import RegisterForm from './register-form';

interface AuthTabsProps {
  defaultTab?: 'login' | 'register';
}

export default function AuthTabs({ defaultTab = 'login' }: AuthTabsProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultTab);

  return (
    <div className="w-full">
      <div className="mb-8 flex justify-center border-b border-foreground/5 p-0">
        <button
          className={`relative px-6 py-3 text-sm font-medium transition-colors ${
            mode === 'login' ? 'text-accent' : 'text-foreground/40 hover:text-foreground/70'
          }`}
          onClick={() => setMode('login')}
        >
          Sign in
          {mode === 'login' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>
        <button
          className={`relative px-6 py-3 text-sm font-medium transition-colors ${
            mode === 'register' ? 'text-accent' : 'text-foreground/40 hover:text-foreground/70'
          }`}
          onClick={() => setMode('register')}
        >
          Create account
          {mode === 'register' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === 'login' ? 10 : -10 }}
          transition={{ duration: 0.2 }}
        >
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}