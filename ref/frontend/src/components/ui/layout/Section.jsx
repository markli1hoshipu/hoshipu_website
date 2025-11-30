import React from 'react';
import { cn } from '../../../lib/utils';

const Section = React.forwardRef(({
  className,
  children,
  padding = 'default',
  background = 'default',
  ...props
}, ref) => {
  const paddings = {
    none: 'p-0',
    sm: 'py-4',
    default: 'py-8',
    lg: 'py-16'
  };
  
  const backgrounds = {
    default: 'bg-white',
    gray: 'bg-gray-50',
    primary: 'bg-primary',
    transparent: 'bg-transparent'
  };

  return (
    <section
      ref={ref}
      className={cn(
        paddings[padding],
        backgrounds[background],
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
});

Section.displayName = 'Section';

export default Section;