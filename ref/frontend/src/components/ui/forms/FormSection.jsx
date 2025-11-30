import React from 'react';
import { cn } from '../../../lib/utils';

const FormSection = React.forwardRef(({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('space-y-6', className)}
      {...props}
    >
      {title && (
        <div className="space-y-1">
          <h3 className={cn('text-lg font-semibold text-gray-900', titleClassName)}>
            {title}
          </h3>
          {description && (
            <p className={cn('text-sm text-gray-600', descriptionClassName)}>
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
});

FormSection.displayName = 'FormSection';

export default FormSection;