import React from 'react';
import { Label } from '../primitives/label';
import { Input } from '../primitives/input';
import { cn } from '../../../lib/utils';

/**
 * Enhanced FormField component that wraps shadcn primitives
 * Works seamlessly with useFormValidation hook via getFieldProps()
 *
 * @param {string} label - Field label text
 * @param {string} id - HTML id (auto-generated from label if not provided)
 * @param {string} error - Error message to display
 * @param {boolean} required - Show required asterisk
 * @param {React.Component} component - Component to render (defaults to Input)
 * @param {string} className - Container class names
 * @param {string} labelClassName - Label class names
 * @param {string} inputClassName - Input/component class names
 * @param {React.ReactNode} children - Custom content (overrides component prop)
 *
 * Usage with useFormValidation:
 * <FormField label="Email" required {...getFieldProps('email')} />
 * <FormField label="Note" component={Textarea} {...getFieldProps('note')} />
 */
const FormField = React.forwardRef(({
  label,
  id,
  error,
  required = false,
  component: Component = Input,
  className,
  labelClassName,
  inputClassName,
  children,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium text-gray-700',
            { 'after:content-["*"] after:ml-1 after:text-red-500': required },
            labelClassName
          )}
        >
          {label}
        </Label>
      )}

      {children || (
        <Component
          ref={ref}
          id={inputId}
          className={cn(
            {
              'border-red-300 focus:border-red-500 focus:ring-red-500': error
            },
            inputClassName
          )}
          {...props}
        />
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;