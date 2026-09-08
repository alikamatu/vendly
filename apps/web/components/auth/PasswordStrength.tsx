"use client";

import React, { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  value?: string;
  password?: string;
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

export default function PasswordStrength({ value, password }: PasswordStrengthProps) {
  const pwd = value ?? password ?? "";
  const { score, results } = useMemo(() => {
    const r = RULES.map((rule) => ({ ...rule, passed: rule.test(pwd) }));
    let s = r.filter((x) => x.passed).length;
    if (pwd.length >= 14) s = Math.min(s + 1, LEVELS.length - 1);
    return { score: s, results: r };
  }, [pwd]);

  if (!pwd) return null;

  const level = LEVELS[Math.max(0, Math.min(score, LEVELS.length - 1))];

  return (
    <div className="space-y-2 text-[11px] pt-0.5">
      <div className="flex items-center gap-2.5">
        {/* 4 discrete segments like macOS */}
        <div className="flex-1 grid grid-cols-4 gap-1.5 h-1.5">
          {[1, 2, 3, 4].map((step) => {
            const isFilled = score >= step;
            return (
              <div
                key={step}
                className={`h-full rounded-full transition-colors duration-200 ${
                  isFilled ? level.className : "bg-border"
                }`}
              />
            );
          })}
        </div>
        <span className={`text-[11px] font-medium transition-colors ${level.text}`}>
          {level.label}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
        {results.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              rule.passed ? "text-emerald-500 font-medium" : "text-foreground/40"
            }`}
          >
            {rule.passed ? (
              <Check className="w-3 h-3 flex-shrink-0 text-emerald-500" strokeWidth={2.5} />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 ml-0.5 mr-1 shrink-0" />
            )}
            <span className="leading-tight truncate">{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
