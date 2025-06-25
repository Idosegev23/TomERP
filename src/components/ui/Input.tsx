import React from 'react';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    label,
    error,
    helpText,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = true,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const inputClasses = clsx(
      'block rounded-lg border-gray-300 text-gray-900',
      'focus:border-primary-500 focus:ring-primary-500',
      'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
      'placeholder:text-gray-400',
      {
        'w-full': fullWidth,
        'border-red-300 focus:border-red-500 focus:ring-red-500': error,
        'pl-10': Icon && iconPosition === 'left',
        'pr-10': Icon && iconPosition === 'right',
      },
      className
    );

    return (
      <div className={clsx('space-y-1', { 'w-full': fullWidth })}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {Icon && (
            <div className={clsx(
              'absolute inset-y-0 flex items-center pointer-events-none',
              iconPosition === 'left' ? 'left-3' : 'right-3'
            )}>
              <Icon className="h-5 w-5 text-gray-400" />
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            {...props}
          />
        </div>
        
        {(error || helpText) && (
          <p className={clsx(
            'text-sm',
            error ? 'text-red-600' : 'text-gray-500'
          )}>
            {error || helpText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 