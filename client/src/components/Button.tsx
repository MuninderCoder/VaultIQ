import React from 'react';
import { cn } from '../utils/cn';
import { LoadingSpinner } from './LoadingSpinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary:
        'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-transparent shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      secondary:
        'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
      outline:
        'border border-brand-600 text-brand-600 hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-transparent shadow-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
      ghost:
        'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus-visible:ring-2 focus-visible:ring-slate-400'
    };

    const sizeClasses = {
      sm: 'text-xs px-2.5 py-1.5 rounded-md font-medium gap-1.5',
      md: 'text-sm px-3.5 py-2 rounded-lg font-medium gap-2',
      lg: 'text-base px-4.5 py-2.5 rounded-lg font-semibold gap-2.5'
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-colors duration-150 select-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <LoadingSpinner
            size={size === 'sm' ? 'sm' : 'md'}
            color={variant === 'primary' || variant === 'danger' ? 'white' : 'brand'}
          />
        )}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
