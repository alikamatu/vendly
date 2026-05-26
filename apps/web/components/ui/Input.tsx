import React, { useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import clsx from '@/utils/clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  registration?: UseFormRegisterReturn;
  /**
   * Opt out of the built-in show/hide toggle on password fields.
   * Defaults to true when `type === 'password'`. Set false for fields
   * where revealing the value would defeat the purpose (e.g. a CVV
   * confirmation prompt — none today, but worth keeping the escape hatch).
   */
  allowPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
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
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasContent, setHasContent] = useState(!!props.defaultValue || !!props.value);
    const [revealPassword, setRevealPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const isPassword = type === 'password';
    const showToggle = isPassword && allowPasswordToggle;
    // While the field is "shown", swap the type so the browser renders
    // plain text — but keep autocomplete + autocapitalize off so password
    // managers don't mis-classify the field.
    const effectiveType = isPassword && revealPassword ? 'text' : type;

    // Separate registration props
    const { ref: regRef, onBlur: regOnBlur, onChange: regOnChange, ...regRest } = registration || {};

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasContent(!!e.target.value);
      setCapsLock(false);
      if (onBlur) onBlur(e);
      if (regOnBlur) regOnBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasContent(!!e.target.value);
      if (props.onChange) props.onChange(e);
      if (regOnChange) regOnChange(e);
    };

    // Caps Lock indicator only makes sense on password inputs — typing
    // "MOM" into your email isn't worth a warning. `getModifierState` is
    // supported in every modern browser; falls back gracefully if not.
    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isPassword && typeof e.getModifierState === 'function') {
        setCapsLock(e.getModifierState('CapsLock'));
      }
    };

    return (
      <div className="group relative pt-6">
        <div className="relative flex items-center">
          {icon && (
            <div
              className={clsx(
                'absolute left-0 top-1/2 -translate-y-1/2 transition-colors duration-200',
                isFocused ? 'text-accent' : 'text-foreground/40',
              )}
            >
              {icon}
            </div>
          )}

          <input
            {...props}
            {...regRest}
            type={effectiveType}
            ref={(e) => {
              // Handle forwarded ref
              if (typeof ref === 'function') ref(e);
              else if (ref) ref.current = e;
              // Handle registration ref
              if (regRef) regRef(e);
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyUp={(e) => {
              handleKey(e);
              if (onKeyUp) onKeyUp(e);
            }}
            onKeyDown={(e) => {
              handleKey(e);
              if (onKeyDown) onKeyDown(e);
            }}
            placeholder=""
            className={clsx(
              'w-full bg-transparent px-0 py-2 text-foreground transition-all duration-200 focus:outline-none',
              'border-b border-foreground/15 focus:border-accent',
              icon ? 'pl-8' : '',
              showToggle ? 'pr-8' : '',
              error ? 'border-red-500 focus:border-red-500' : '',
              className,
            )}
          />

          {/* Show / hide password toggle. Hidden from the tab order so it
              doesn't interrupt the form's natural keyboard flow; users
              who want it can click. Screen-reader label updates with state. */}
          {showToggle && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setRevealPassword((v) => !v)}
              aria-label={revealPassword ? 'Hide password' : 'Show password'}
              title={revealPassword ? 'Hide password' : 'Show password'}
              className={clsx(
                'absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors',
                isFocused ? 'text-accent' : 'text-foreground/40 hover:text-foreground/70',
              )}
            >
              {revealPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {/* Animated underline */}
          <motion.div
            initial={false}
            animate={{ scaleX: isFocused ? 1 : 0 }}
            className={clsx(
              'absolute bottom-0 left-0 h-0.5 w-full origin-left bg-accent transition-colors',
              error ? 'bg-red-500' : '',
            )}
            transition={{ duration: 0.2 }}
          />

          {/* Floating Label */}
          {label && (
            <motion.label
              initial={false}
              animate={{
                top: isFocused || hasContent ? -16 : 8,
                left: icon ? (isFocused || hasContent ? 0 : 32) : 0,
                scale: isFocused || hasContent ? 0.85 : 1,
                color: error
                  ? '#ef4444'
                  : isFocused
                  ? 'var(--color-accent)'
                  : 'rgba(var(--color-foreground-rgb))',
              }}
              className="pointer-events-none absolute left-0 origin-left text-base transition-colors duration-200"
            >
              {label}
            </motion.label>
          )}
        </div>

        {/* Caps Lock hint — only renders while the field is focused AND
            Caps Lock is detected. Sits above the error slot so the error
            still wins layout when both apply. */}
        <AnimatePresence>
          {isPassword && isFocused && capsLock && !error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-500"
            >
              <AlertTriangle size={12} />
              Caps Lock is on
            </motion.p>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-1.5 text-xs text-red-500"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
