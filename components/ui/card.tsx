import React from 'react';

type CardProps = { children?: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>;

export const Card = ({ children, className = '', ...props }: CardProps) => (
  <div className={`bg-white rounded-xl ${className}`} {...props}>{children}</div>
);

export const CardHeader = ({ children, className = '', ...props }: CardProps) => (
  <div className={`p-6 ${className}`} {...props}>{children}</div>
);

export const CardTitle = ({ children, className = '', ...props }: CardProps) => (
  <h3 className={`font-semibold ${className}`} {...props}>{children}</h3>
);

export const CardContent = ({ children, className = '', ...props }: CardProps) => (
  <div className={`p-6 ${className}`} {...props}>{children}</div>
);

export const CardFooter = ({ children, className = '', ...props }: CardProps) => (
  <div className={`p-6 ${className}`} {...props}>{children}</div>
);