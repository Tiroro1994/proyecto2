import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldErrorProps {
  error?: string | null;
  fieldName?: string;
}

export const FormFieldError: React.FC<FormFieldErrorProps> = ({ error, fieldName }) => {
  if (!error) return null;

  return (
    <p className="mt-1 text-[11px] font-semibold text-rose-600 flex items-center gap-1 animate-in fade-in duration-100">
      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
      <span>{error}</span>
    </p>
  );
};

export const getInputErrorClass = (hasError: boolean, defaultClass = 'border-slate-300 focus:ring-emerald-500') => {
  if (hasError) {
    return 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/40 text-rose-900 focus:ring-rose-500 focus:border-rose-500';
  }
  return defaultClass;
};
