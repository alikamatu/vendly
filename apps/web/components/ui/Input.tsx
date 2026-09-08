'use client';

import React, { useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import clsx from '@/utils/clsx';
import { motion, AnimatePresence } from 'framer-motion';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: React.ReactNode;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  registration?: UseFormRegisterReturn;
  allowPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      labelRight,
      hint,
      error,
      icon,
      className,
      registration,
      onFocus,
      onBlur,
      onKeyUp,
      onKeyDown,
      type,
      allowPasswordToggle = true,
      id,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [revealPassword, setRevealPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const generatedId = React.useId();
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);

    const isPassword = type === 'password';
    const showToggle = isPassword && allowPasswordToggle;
    const effectiveType = isPassword && revealPassword ? 'text' : type;

    const { ref: regRef, onBlur: regOnBlur, onChange: regOnChange, ...regRest } = registration || {};

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setCapsLock(false);
      if (onBlur) onBlur(e);
      if (regOnBlur) regOnBlur(e);
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isPassword && typeof e.getModifierState === 'function') {
        setCapsLock(e.getModifierState('CapsLock'));
      }
      if (onKeyUp) onKeyUp(e);
    };

    return (
      <div className="w-full text-left">
        {/* Top Label Row */}
        {(label || labelRight) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <label
                htmlFor={inputId}
                className={clsx(
                  'text-xs font-medium tracking-tight transition-colors',
                  error ? 'text-red-500' : isFocused ? 'text-foreground font-semibold' : 'text-foreground/80'
                )}
              >
                {label}
              </label>
            )}
            {labelRight && <div className="text-xs">{labelRight}</div>}
          </div>
        )}

        {/* Apple & Linear Inspired Bordered Box */}
        <div
          className={clsx(
            'group relative flex items-center w-full h-11 rounded-xl transition-all duration-200',
            'border bg-input-bg',
            error
              ? 'border-red-500/80 focus-within:border-red-500'
              : 'border-input-border hover:border-foreground/30 hover:bg-input-bg/90 focus-within:border-secondary focus-within:bg-background'
          )}
        >
          {/* Left Inset Icon */}
          {icon && (
            <div
              className={clsx(
                'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-150',
                error ? 'text-red-500' : isFocused ? 'text-secondary' : 'text-foreground/45'
              )}
            >
              {icon}
            </div>
          )}

          {/* Actual Input */}
          <input
            {...props}
            {...regRest}
            id={inputId}
            type={effectiveType}
            ref={(e) => {
              if (typeof ref === 'function') ref(e);
              else if (ref) ref.current = e;
              if (regRef) regRef(e);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(e) => {
              if (props.onChange) props.onChange(e);
              if (regOnChange) regOnChange(e);
            }}
            onKeyUp={handleKey}
            onKeyDown={onKeyDown}
            className={clsx(
              'h-full w-full bg-transparent px-3.5 text-sm text-foreground placeholder:text-foreground/40 outline-none font-normal selection:bg-secondary/20',
              icon ? 'pl-10' : '',
              showToggle ? 'pr-10' : '',
              className
            )}
          />

          {/* Password Show/Hide Toggle */}
          {showToggle && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setRevealPassword((v) => !v)}
              aria-label={revealPassword ? 'Hide password' : 'Show password'}
              title={revealPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors focus:outline-none"
            >
              {revealPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {/* Hint text */}
        {hint && !error && (
          <p className="mt-1.5 text-[11px] text-foreground/50 leading-relaxed">{hint}</p>
        )}

        {/* Caps Lock Alert */}
        <AnimatePresence>
          {isPassword && isFocused && capsLock && !error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-500 font-medium"
            >
              <AlertTriangle size={12} className="shrink-0" />
              Caps Lock is turned on
            </motion.p>
          )}
        </AnimatePresence>

        {/* Animated Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500"
            >
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
