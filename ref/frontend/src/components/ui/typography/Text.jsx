import React from 'react';
import { cn } from '../../../lib/utils';

const Text = React.forwardRef(({
  className,
  children,
  variant = 'default',
  size = 'base',
  weight = 'normal',
  ...props
}, ref) => {
  const variants = {
    default: 'text-gray-900',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };
  
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };
  
  const weights = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  return (
    <p
      ref={ref}
      className={cn(
        variants[variant],
        sizes[size],
        weights[weight],
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});

Text.displayName = 'Text';

export default Text;