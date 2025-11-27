import React from 'react';

// FIX: Intersected with HTMLAttributes to allow standard props like 'key'.
export const Skeleton = ({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} {...props} />
);