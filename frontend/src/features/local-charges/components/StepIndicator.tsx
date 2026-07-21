import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface StepInfo {
  label: string;
  description?: string;
  status: 'done' | 'active' | 'upcoming' | 'error';
}

interface StepIndicatorProps {
  steps: StepInfo[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="relative flex items-start overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible sm:justify-between">
      {/* Connecting line behind the bubbles */}
      <div className="absolute top-[18px] left-[42px] right-[42px] h-px bg-secondary/20 z-0 sm:left-0 sm:right-0 sm:mx-[40px]" />

      {steps.map((step, index) => {
        const isDone = step.status === 'done';
        const isActive = step.status === 'active';
        const isError = step.status === 'error';

        return (
          <div
            key={index}
            className="relative z-10 flex flex-col items-center shrink-0 w-[84px] sm:flex-1 sm:w-auto sm:min-w-[80px] gap-2 snap-center"
          >
            {/* Bubble */}
            <div
              className={`
                w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                ${isDone ? 'bg-emerald-500 shadow-md shadow-emerald-500/25' : ''}
                ${isActive ? 'bg-tertiary shadow-md shadow-tertiary/30' : ''}
                ${isError ? 'bg-rose-500 shadow-md shadow-rose-500/25' : ''}
                ${step.status === 'upcoming' ? 'bg-neutral border-2 border-secondary/20' : ''}
              `}
            >
              {isDone && <CheckCircle size={16} className="text-white sm:w-[18px] sm:h-[18px]" />}
              {isError && <AlertCircle size={16} className="text-white sm:w-[18px] sm:h-[18px]" />}
              {(isActive || step.status === 'upcoming') && (
                <span
                  className={`text-[0.68rem] sm:text-[0.72rem] font-bold font-mono ${
                    isActive ? 'text-white' : 'text-secondary'
                  }`}
                >
                  {index + 1}
                </span>
              )}
            </div>

            {/* Label */}
            <div className="text-center px-0.5">
              <p
                className={`no-underline decoration-transparent text-[0.62rem] sm:text-[0.72rem] font-semibold uppercase tracking-wide leading-tight transition-colors ${
                  isDone ? 'text-emerald-600' : isActive ? 'text-tertiary' : isError ? 'text-rose-500' : 'text-secondary/50'
                }`}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="no-underline decoration-transparent text-[0.65rem] text-secondary/50 mt-0.5 hidden sm:block">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
