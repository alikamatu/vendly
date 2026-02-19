'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LoginForm from './login-form';
import RegisterForm from './register-form';
import Button from '@/components/ui/Button';

interface AuthTabsProps {
  defaultTab?: 'login' | 'register';
}

export default function AuthTabs({ defaultTab = 'login' }: AuthTabsProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultTab);

  return (
    <div className="w-full">
      <div className="mb-8 flex gap-1 rounded-xl bg-foreground/5 p-1">
        <Button
          variant={mode === 'login' ? 'primary' : 'ghost'}
          className="flex-1 rounded-lg"
          onClick={() => setMode('login')}
        >
          Sign in
        </Button>
        <Button
          variant={mode === 'register' ? 'primary' : 'ghost'}
          className="flex-1 rounded-lg"
          onClick={() => setMode('register')}
        >
          Create account
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'login' ? <LoginForm key="login" /> : <RegisterForm key="register" />}
      </AnimatePresence>
    </div>
  );
}