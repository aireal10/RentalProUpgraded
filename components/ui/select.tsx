import React from 'react';

export const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children?: React.ReactNode }) => (
  <select className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50" {...props}>
    {children}
  </select>
);

export const SelectTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
  <div {...props}>{children}</div> // This is a simplified placeholder
);

export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span>{placeholder}</span> // This is a simplified placeholder
);

export const SelectContent = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</> // In a real component this would be a popover
);

export const SelectItem = ({ children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement> & { children?: React.ReactNode }) => (
  <option {...props}>{children}</option>
);