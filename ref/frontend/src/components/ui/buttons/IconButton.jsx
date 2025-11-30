import React from 'react';
import { Button } from '../primitives/button';
import { cn } from '../../../lib/utils';

const IconButton = React.forwardRef(({
  icon: Icon,
  variant = 'ghost',
  size = 'icon',
  className,
  children,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      {Icon && <Icon className={children ? 'mr-2' : ''} size={16} />}
      {children}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;