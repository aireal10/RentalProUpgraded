
import React from 'react';
import { format, formatHijri } from '../../utils/helpers';

interface DateDisplayProps {
  dateString: string | Date | null | undefined;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({ dateString }) => {
  if (!dateString) {
    return <span>-</span>;
  }
  
  // Parse date string as UTC to avoid timezone issues. YYYY-MM-DD is parsed as UTC midnight.
  const date = typeof dateString === 'string' ? new Date(`${dateString}T00:00:00Z`) : dateString;
  
  if (isNaN(date.getTime())) {
    // Handle cases where the date string might be invalid or not in YYYY-MM-DD format
    const localDate = new Date(dateString);
    if(isNaN(localDate.getTime())) return <span>Invalid Date</span>;
    
     return (
        <div>
          <span>{format(localDate, 'MMM d, yyyy')}</span>
          <span className="block text-xs text-slate-500">{formatHijri(localDate)}</span>
        </div>
      );
  }

  return (
    <div>
      <span>{format(date, 'MMM d, yyyy')}</span>
      <span className="block text-xs text-slate-500">{formatHijri(date)}</span>
    </div>
  );
};
