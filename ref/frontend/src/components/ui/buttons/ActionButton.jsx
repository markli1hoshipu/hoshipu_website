import React from 'react';
import { Button } from '../primitives/button';
import { cn } from '../../../lib/utils';

const ActionButton = React.forwardRef(({
  variant = 'default',
  size = 'default',
  color = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}, ref) => {
  const colorVariants = {
    primary: 'default',
    secondary: 'secondary', 
    success: 'default',
    warning: 'outline',
    danger: 'destructive',
    info: 'outline'
  };

  return (
    <Button
      ref={ref}
      variant={colorVariants[color] || variant}
      size={size}
      className={cn(
        {
          'w-full': fullWidth,
          'bg-green-600 hover:bg-green-700': color === 'success' && variant === 'default',
          'bg-yellow-600 hover:bg-yellow-700': color === 'warning' && variant === 'default',
          'bg-blue-600 hover:bg-blue-700': color === 'info' && variant === 'default'
        },
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;