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
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Selected option details
  const selectedOption = options.find((o) => o.value === value);

  // Auto-enable search if there are more than 7 options
  const isSearchable = searchable ?? options.length > 7;

  // Filter options based on search query
  const filteredOptions = isSearchable && searchQuery.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          o.description?.toLowerCase().includes(searchQuery.toLowerCase().trim())
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
    <div className={clsx('w-full text-left relative', className)} ref={containerRef}>
      {/* Label Row */}
      {(label || labelRight) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <label
              htmlFor={selectId}
              className={clsx(
                'text-xs font-medium tracking-tight transition-colors',
                error ? 'text-red-500' : isOpen ? 'text-foreground font-semibold' : 'text-foreground/80'
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
          'relative flex items-center justify-between w-full transition-all duration-200 outline-none text-left select-none',
          size === 'sm' ? 'h-9 px-3 rounded-lg text-xs' : 'h-11 px-3.5 rounded-xl text-sm',
          'border bg-input-bg shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
          error
            ? 'border-red-500/80 focus:border-red-500'
            : isOpen
            ? 'border-secondary bg-background'
            : 'border-input-border hover:border-foreground/30 hover:bg-input-bg/90',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
          {icon && (
            <span className={clsx('shrink-0 transition-colors', isOpen ? 'text-secondary' : 'text-foreground/45')}>
              {icon}
            </span>
          )}

          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="font-normal text-foreground truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary shrink-0">
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
          className="shrink-0 text-foreground/45 ml-1"
        >
          <ChevronDown size={16} />
        </MotionSpan>
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-background dark:bg-[#141414] border border-border/80 overflow-hidden shadow-lg"
          >
            {/* Search Filter when enabled */}
            {isSearchable && (
              <div className="p-2 pb-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/90 text-xs">
                  <Search size={14} className="text-foreground/40 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground/40 text-xs"
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
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="py-5 text-center text-xs text-foreground/50">
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
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-all duration-150 outline-none select-none',
                        isSelected
                          ? 'bg-secondary/10 text-secondary font-medium'
                          : 'text-foreground/80 hover:bg-surface hover:text-foreground',
                        opt.disabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{opt.label}</p>
                          {opt.description && (
                            <p className="text-[11px] text-foreground/50 truncate font-normal">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {opt.badge && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-md bg-secondary/10 text-secondary">
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
        <p className="mt-1.5 text-[11px] text-foreground/50 leading-relaxed">{hint}</p>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}
