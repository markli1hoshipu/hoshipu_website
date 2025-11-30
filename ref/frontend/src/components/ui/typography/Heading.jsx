import React from 'react';
import { cn } from '../../../lib/utils';

const Heading = React.forwardRef(({
  level = 1,
  className,
  children,
  variant = 'default',
  ...props
}, ref) => {
  const Tag = `h${level}`;
  
  const variants = {
    default: 'text-gray-900 font-semibold',
    secondary: 'text-gray-600 font-medium',
    accent: 'text-primary font-bold'
  };
  
  const sizes = {
    1: 'text-3xl lg:text-4xl',
    2: 'text-2xl lg:text-3xl', 
    3: 'text-xl lg:text-2xl',
    4: 'text-lg lg:text-xl',
    5: 'text-base lg:text-lg',
    6: 'text-sm lg:text-base'
  };

  return (
    <Tag
      ref={ref}
      className={cn(
        variants[variant],
        sizes[level],
        'leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

Heading.displayName = 'Heading';

export default Heading;