import React from 'react';
import { cn } from '../../../lib/utils';

const FormGroup = React.forwardRef(({
  className,
  children,
  inline = false,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'space-y-4',
        {
          'flex flex-wrap gap-4 space-y-0': inline
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

FormGroup.displayName = 'FormGroup';

export default FormGroup;