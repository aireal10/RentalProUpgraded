import React from 'react';

// FIX: Changed to a type intersection to correctly include all div attributes.
type BadgeProps = {
  variant?: 'default' | 'outline';
} & React.HTMLAttributes<HTMLDivElement>

export const Badge = ({ children, className = '', variant = 'default', ...props }: BadgeProps) => {
  const baseClasses = 'inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  
  const variantClasses = {
    default: 'bg-slate-900 text-white',
    outline: 'text-slate-900',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};