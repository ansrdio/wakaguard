'use client';

import { ReactNode } from 'react';

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
  ariaLabel = 'Segmented control',
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1 ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${option.value}`}
            onClick={() => onChange(option.value)}
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${isActive
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }
            `}
          >
            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'}
                `}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
