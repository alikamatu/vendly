"use client";

import React, { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  value: string;
}

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "A number or symbol", test: (v) => /[\d\W]/.test(v) },
];

const LEVELS = [
  { label: "Too weak", className: "bg-red-500", text: "text-red-500" },
  { label: "Weak", className: "bg-orange-500", text: "text-orange-500" },
  { label: "Fair", className: "bg-amber-500", text: "text-amber-500" },
  { label: "Strong", className: "bg-emerald-500", text: "text-emerald-500" },
  { label: "Excellent", className: "bg-emerald-600", text: "text-emerald-600" },
];

export default function PasswordStrength({ value }: PasswordStrengthProps) {
  const { score, results } = useMemo(() => {
    const r = RULES.map((rule) => ({ ...rule, passed: rule.test(value) }));
    let s = r.filter((x) => x.passed).length;
    // Bonus point for very long passwords
    if (value.length >= 14) s = Math.min(s + 1, LEVELS.length - 1);
    return { score: s, results: r };
  }, [value]);

  if (!value) return null;

  const level = LEVELS[Math.max(0, Math.min(score, LEVELS.length - 1))];

  return (
    <div className="space-y-2 text-[11px]">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
          <div
            className={`h-full rounded-full ${level.className} transition-all duration-300`}
            style={{ width: `${(Math.min(score, LEVELS.length - 1) / (LEVELS.length - 1)) * 100}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={LEVELS.length - 1}
            aria-label={`Password strength: ${level.label}`}
          />
        </div>
        <span className={`font-bold ${level.text}`}>{level.label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {results.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 ${
              rule.passed ? "text-emerald-500" : "text-muted"
            }`}
          >
            {rule.passed ? (
              <Check className="w-3 h-3 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 flex-shrink-0 opacity-40" />
            )}
            <span className="leading-tight">{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
