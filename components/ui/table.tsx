import React from 'react';

export const Table = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.TableHTMLAttributes<HTMLTableElement>) => (
  <table className={`w-full caption-bottom text-sm ${className}`} {...props}>{children}</table>
);

export const TableHeader = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`[&_tr]:border-b ${className}`} {...props}>{children}</thead>
);

export const TableBody = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props}>{children}</tbody>
);

export const TableRow = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b transition-colors hover:bg-slate-100/50 data-[state=selected]:bg-slate-100 ${className}`} {...props}>{children}</tr>
);

export const TableHead = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>{children}</th>
);

export const TableCell = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props}>{children}</td>
);