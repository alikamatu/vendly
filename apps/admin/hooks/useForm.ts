"use client";

import { useState, useCallback, ChangeEvent } from "react";

type ValidationRules<T> = Partial<Record<keyof T, (value: string) => string | null>>;

export function useForm<T extends Record<string, string>>(
  initialValues: T,
  validationRules?: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      // Clear error on change if field was touched
      if (touched[name as keyof T]) {
        const rule = validationRules?.[name as keyof T];
        const error = rule ? rule(value) : null;
        setErrors((prev) => ({ ...prev, [name]: error ?? undefined }));
      }
    },
    [touched, validationRules]
  );

  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      const rule = validationRules?.[name as keyof T];
      const error = rule ? rule(value) : null;
      setErrors((prev) => ({ ...prev, [name]: error ?? undefined }));
    },
    [validationRules]
  );

  const validate = useCallback((): boolean => {
    if (!validationRules) return true;
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;
    for (const key in validationRules) {
      const rule = validationRules[key];
      const error = rule ? rule(values[key]) : null;
      if (error) {
        newErrors[key] = error;
        valid = false;
      }
    }
    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return valid;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, handleChange, handleBlur, validate, reset };
}
