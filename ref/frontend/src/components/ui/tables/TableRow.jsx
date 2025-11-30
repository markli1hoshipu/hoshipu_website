import React from 'react';
import { cn } from '../../../lib/utils';

const TableRow = React.forwardRef(({ 
  className,
  children,
  variant = 'default',
  ...props 
}, ref) => {
  return (
    <tr
      ref={ref}
      className={cn(
        'border-b transition-colors',
        {
          'hover:bg-muted/50 data-[state=selected]:bg-muted': variant === 'default',
          'bg-red-50 border-red-200': variant === 'danger',
          'bg-green-50 border-green-200': variant === 'success',
          'bg-yellow-50 border-yellow-200': variant === 'warning'
        },
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

export default TableRow;