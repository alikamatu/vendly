import React, { useState } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import clsx from '@/utils/clsx';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  registration?: UseFormRegisterReturn;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, registration, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasContent, setHasContent] = useState(!!props.defaultValue || !!props.value);
    
    // Separate registration props
    const { ref: regRef, onBlur: regOnBlur, onChange: regOnChange, ...regRest } = registration || {};

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasContent(!!e.target.value);
      if (onBlur) onBlur(e);
      if (regOnBlur) regOnBlur(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasContent(!!e.target.value);
      if (props.onChange) props.onChange(e);
      if (regOnChange) regOnChange(e);
    };

    return (
      <div className="group relative pt-6">
        <div className="relative flex items-center">
          {icon && (
            <div className={clsx(
              "absolute left-0 top-1/2 -translate-y-1/2 transition-colors duration-200",
              isFocused ? "text-accent" : "text-foreground/40"
            )}>
              {icon}
            </div>
          )}
          
          <input
            {...props}
            {...regRest}
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
            placeholder=""
            className={clsx(
              'w-full bg-transparent px-0 py-2 text-foreground transition-all duration-200 focus:outline-none',
              'border-b border-foreground/15 focus:border-accent',
              icon ? 'pl-8' : '',
              error ? 'border-red-500 focus:border-red-500' : '',
              className
            )}
          />

          {/* Animated underline */}
          <motion.div
            initial={false}
            animate={{ scaleX: isFocused ? 1 : 0 }}
            className={clsx(
              "absolute bottom-0 left-0 h-0.5 w-full origin-left bg-accent transition-colors",
              error ? "bg-red-500" : ""
            )}
            transition={{ duration: 0.2 }}
          />

          {/* Floating Label */}
          {label && (
            <motion.label
              initial={false}
              animate={{
                top: (isFocused || hasContent) ? -16 : 8,
                left: icon ? (isFocused || hasContent ? 0 : 32) : 0,
                scale: (isFocused || hasContent) ? 0.85 : 1,
                color: error ? '#ef4444' : (isFocused ? 'var(--color-accent)' : 'rgba(var(--color-foreground-rgb), 0.6)')
              }}
              className="pointer-events-none absolute left-0 origin-left text-base transition-colors duration-200"
            >
              {label}
            </motion.label>
          )}
        </div>

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
  }
);

Input.displayName = 'Input';
export default Input;