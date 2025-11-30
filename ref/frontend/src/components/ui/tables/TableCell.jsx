import React from 'react';
import { cn } from '../../../lib/utils';

const TableCell = React.forwardRef(({ 
  className,
  children,
  header = false,
  align = 'left',
  ...props 
}, ref) => {
  const Tag = header ? 'th' : 'td';
  
  return (
    <Tag
      ref={ref}
      className={cn(
        'px-4 py-3',
        {
          'text-left text-xs font-medium text-gray-500 uppercase tracking-wider': header,
          'text-sm text-gray-900': !header,
          'text-left': align === 'left',
          'text-center': align === 'center', 
          'text-right': align === 'right'
        },
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

TableCell.displayName = 'TableCell';

export default TableCell;