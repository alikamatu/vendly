"use client";

import React, { useState, forwardRef, useRef } from "react";
import { clsx } from "../../utils/clsx";
import { motion, AnimatePresence } from "framer-motion";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightElement, className, id, onFocus, onBlur, ...props },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(!!props.defaultValue || !!props.value);
  const pointerDownRef = useRef(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Ignore focus events triggered by pointer (mouse/tap) so clicks don't
    // activate the focused styles. Keyboard focus (Tab) still works.
    if (pointerDownRef.current) {
      pointerDownRef.current = false;
      return;
    }
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setHasContent(!!e.target.value);
    if (onBlur) onBlur(e);
  };

  const handlePointerDown = () => {
    pointerDownRef.current = true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasContent(!!e.target.value);
    if (props.onChange) props.onChange(e);
  };

  return (
    <div className="group relative pt-6 w-full">
      <div className="relative flex items-center">
        {leftIcon && (
          <div className={clsx(
            "absolute left-0 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none",
            isFocused ? "text-[--color-primary]" : "text-[--color-foreground]/40"
          )}>
            {leftIcon}
          </div>
        )}
        
        <input
          {...props}
          ref={ref}
          id={inputId}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder=""
          className={clsx(
            "w-full bg-transparent px-0 py-2.5 text-sm transition-all duration-200 focus:outline-none",
            "border-b border-[--color-foreground]/15 focus:border-[--color-primary]",
            leftIcon ? "pl-8" : "",
            rightElement ? "pr-10" : "",
            error ? "border-red-500/70 focus:border-red-500" : "",
            className
          )}
        />

        {/* Animated underline */}
        <motion.div
          initial={false}
          animate={{ scaleX: isFocused ? 1 : 0 }}
          className={clsx(
            "absolute bottom-0 left-0 h-0.5 w-full origin-left bg-[--color-primary] transition-colors",
            error ? "bg-red-500" : ""
          )}
          transition={{ duration: 0.2 }}
        />

        {/* Floating Label */}
        {label && (
          <motion.label
            htmlFor={inputId}
            initial={false}
            animate={{
              top: (isFocused || hasContent) ? -16 : 10,
              left: leftIcon ? (isFocused || hasContent ? 0 : 32) : 0,
              scale: (isFocused || hasContent) ? 0.85 : 1,
              color: error ? "#ef4444" : (isFocused ? "var(--color-primary)" : "rgba(var(--color-foreground-rgb), 0.6)")
            }}
            className="pointer-events-none absolute left-0 origin-left text-sm transition-colors duration-200"
          >
            {label}
          </motion.label>
        )}

        {rightElement && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">{rightElement}</div>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-1.5 text-[10px] text-red-500 flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {hint && !error && (
        <p className="mt-1.5 text-[10px] text-[--color-foreground]/40">{hint}</p>
      )}
    </div>
  );
});
