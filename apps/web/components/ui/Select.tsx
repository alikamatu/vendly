'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import clsx from '@/utils/clsx';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;
const MotionSpan = motion.span as any;

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | null;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  labelRight?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  id?: string;
}

export default function Select({
  label,
  labelRight,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  icon,
  error,
  hint,
  searchable,
  disabled = false,
  className,
  size = 'md',
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Auto-flip upward if viewport space below is tight
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Selected option details
  const selectedOption = options.find((o) => o.value === value);

  // Auto-enable search if there are more than 7 options
  const isSearchable = searchable ?? options.length > 7;

  // Filter options based on search query
  const filteredOptions =
    isSearchable && searchQuery.trim()
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
            o.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()),
        )
      : options;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && isSearchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, isSearchable]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      className={clsx(
        'relative w-full text-left transition-all',
        isOpen ? 'z-50' : 'z-auto',
        className,
      )}
      ref={containerRef}
    >
      {/* Label Row */}
      {(label || labelRight) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <label
              htmlFor={selectId}
              className={clsx(
                'text-xs font-medium tracking-tight transition-colors',
                error
                  ? 'text-red-500'
                  : isOpen
                    ? 'text-foreground font-semibold'
                    : 'text-foreground/80',
              )}
            >
              {label}
            </label>
          )}
          {labelRight && <div className="text-xs">{labelRight}</div>}
        </div>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={clsx(
          'relative flex w-full select-none items-center justify-between text-left outline-none transition-all duration-200',
          size === 'sm' ? 'h-9 rounded-lg px-3 text-xs' : 'h-11 rounded-xl px-3.5 text-sm',
          'bg-input-bg border shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
          error
            ? 'border-red-500/80 focus:border-red-500'
            : isOpen
              ? 'border-secondary bg-background'
              : 'border-input-border hover:border-foreground/30 hover:bg-input-bg/90',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5 truncate pr-2">
          {icon && (
            <span
              className={clsx(
                'shrink-0 transition-colors',
                isOpen ? 'text-secondary' : 'text-foreground/45',
              )}
            >
              {icon}
            </span>
          )}

          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="text-foreground truncate font-normal">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="bg-secondary/10 text-secondary shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-foreground/40 font-normal">{placeholder}</span>
          )}
        </div>

        {/* Animated Chevron */}
        <MotionSpan
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-foreground/45 ml-1 shrink-0"
        >
          <ChevronDown size={16} />
        </MotionSpan>
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={clsx(
              'bg-background border-border/80 absolute left-0 right-0 z-50 overflow-hidden rounded-2xl border shadow-2xl dark:bg-[#141414]',
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            {/* Search Filter when enabled */}
            {isSearchable && (
              <div className="p-2 pb-1">
                <div className="bg-surface/90 flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
                  <Search size={14} className="text-foreground/40 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="text-foreground placeholder:text-foreground/40 w-full bg-transparent text-xs outline-none"
                  />
                  {searchQuery && (
                    <MotionButton
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSearchQuery('')}
                      className="text-foreground/40 hover:text-foreground transition-colors"
                    >
                      <X size={12} />
                    </MotionButton>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="no-scrollbar max-h-60 space-y-0.5 overflow-y-auto p-1.5">
              {filteredOptions.length === 0 ? (
                <div className="text-foreground/50 py-5 text-center text-xs">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <MotionButton
                      key={opt.value}
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value)}
                      className={clsx(
                        'flex w-full select-none items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs outline-none transition-all duration-150 sm:text-sm',
                        isSelected
                          ? 'bg-secondary/10 text-secondary font-medium'
                          : 'text-foreground/80 hover:bg-surface hover:text-foreground',
                        opt.disabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{opt.label}</p>
                          {opt.description && (
                            <p className="text-foreground/50 truncate text-[11px] font-normal">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        {opt.badge && (
                          <span className="bg-secondary/10 text-secondary rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check size={16} className="text-secondary" strokeWidth={2.5} />
                        )}
                      </div>
                    </MotionButton>
                  );
                })
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Hint & Error */}
      {hint && !error && (
        <p className="text-foreground/50 mt-1.5 text-[11px] leading-relaxed">{hint}</p>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
