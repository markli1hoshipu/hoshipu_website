import React from 'react';
import { cn } from '../../../lib/utils';

const Container = React.forwardRef(({
  className,
  children,
  size = 'default',
  ...props
}, ref) => {
  const sizes = {
    sm: 'max-w-2xl',
    default: 'max-w-7xl',
    lg: 'max-w-full',
    full: 'w-full'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Container.displayName = 'Container';

export default Container;