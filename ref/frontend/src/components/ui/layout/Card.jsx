import React from 'react';
import { cn } from '../../../lib/utils';

const Card = React.forwardRef(({
  className,
  children,
  padding = 'default',
  shadow = 'default',
  border = true,
  ...props
}, ref) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    default: 'p-6', 
    lg: 'p-8'
  };
  
  const shadows = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    default: 'shadow-md',
    lg: 'shadow-lg'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'bg-white rounded-lg',
        paddings[padding],
        shadows[shadow],
        {
          'border border-gray-200': border
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;