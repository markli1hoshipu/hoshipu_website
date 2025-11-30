import React from 'react';
import { cn } from '../../../lib/utils';

const TableHeader = React.forwardRef(({ 
  className,
  children,
  ...props 
}, ref) => {
  return (
    <thead 
      ref={ref}
      className={cn('bg-gray-50 border-b border-gray-200', className)}
      {...props}
    >
      {children}
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

export default TableHeader;