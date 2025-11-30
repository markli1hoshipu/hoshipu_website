import React from 'react';
import { cn } from '../../../lib/utils';

const Table = React.forwardRef(({ 
  className,
  children,
  striped = false,
  bordered = true,
  hover = true,
  ...props 
}, ref) => {
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          'w-full caption-bottom text-sm',
          {
            'border-collapse border border-gray-200': bordered,
            '[&_tbody_tr:nth-child(even)]:bg-gray-50': striped,
            '[&_tbody_tr:hover]:bg-gray-100': hover
          },
          className
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});

Table.displayName = 'Table';

export default Table;