import React, { createContext, useContext, forwardRef } from "react"
import { cn } from "../../../lib/utils"
import { AlertCircle, CheckCircle, Info } from "lucide-react"

// Form context for managing form state
const FormContext = createContext()

// Root form provider
const Form = ({ children, className, ...props }) => {
  return (
    <form className={cn("prelude-form", className)} {...props}>
      {children}
    </form>
  )
}

// Form field container
const FormField = ({ children, className }) => {
  return (
    <div className={cn("form-field space-y-1.5", className)}>
      {children}
    </div>
  )
}

// Form label with proper accessibility
const FormLabel = forwardRef(({ className, required, children, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "form-label text-sm font-medium text-gray-700 dark:text-gray-200",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" aria-label="required">
          *
        </span>
      )}
    </label>
  )
})
FormLabel.displayName = "FormLabel"

// Form input with error states
const FormInput = forwardRef(({ 
  className, 
  error, 
  success,
  disabled,
  ...props 
}, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        // Base styles
        "flex h-10 w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        
        // State-based styling
        error 
          ? "border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-950/20" 
          : success
          ? "border-green-500 focus-visible:ring-green-500 bg-green-50 dark:bg-green-950/20"
          : "border-input bg-background focus-visible:ring-ring",
        
        className
      )}
      aria-invalid={!!error}
      disabled={disabled}
      {...props}
    />
  )
})
FormInput.displayName = "FormInput"

// Form textarea with error states
const FormTextarea = forwardRef(({
  className,
  error,
  success,
  disabled,
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors duration-200",
        "placeholder:text-muted-foreground resize-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        
        error 
          ? "border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-950/20" 
          : success
          ? "border-green-500 focus-visible:ring-green-500 bg-green-50 dark:bg-green-950/20"
          : "border-input bg-background focus-visible:ring-ring",
        
        className
      )}
      aria-invalid={!!error}
      disabled={disabled}
      {...props}
    />
  )
})
FormTextarea.displayName = "FormTextarea"

// Form error message with proper ARIA
const FormError = ({ id, children, className, ...props }) => {
  if (!children) return null
  
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400",
        "animate-in fade-in-0 slide-in-from-top-1 duration-200",
        className
      )}
      {...props}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
}

// Form success message
const FormSuccess = ({ id, children, className, ...props }) => {
  if (!children) return null
  
  return (
    <div
      id={id}
      className={cn(
        "flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400",
        "animate-in fade-in-0 slide-in-from-top-1 duration-200",
        className
      )}
      {...props}
    >
      <CheckCircle className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
}

// Form help text
const FormHelp = ({ id, children, className, ...props }) => {
  if (!children) return null
  
  return (
    <div
      id={id}
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
      {...props}
    >
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
}

// Complete form field component with all states
const FormFieldComplete = ({ 
  label,
  name,
  error,
  success,
  helpText,
  required = false,
  children,
  className,
  ...fieldProps
}) => {
  const inputId = `${name}-input`
  const errorId = error ? `${name}-error` : undefined
  const helpId = helpText ? `${name}-help` : undefined
  const successId = success ? `${name}-success` : undefined
  
  const describedBy = [errorId, successId, helpId].filter(Boolean).join(' ') || undefined
  
  return (
    <FormField className={className}>
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      
      {/* Render children as-is, let parent handle ARIA attributes */}
      {React.Children.map(children, (child, index) => {
        // If it's a FormInput, clone with proper attributes
        if (React.isValidElement(child) && child.type === FormInput) {
          return React.cloneElement(child, {
            id: inputId,
            'aria-describedby': describedBy,
            error: !!error,
            success: !!success,
            name: name,
            ...fieldProps,
            ...child.props
          })
        }
        // Otherwise render as-is
        return child
      })}
      
      <FormError id={errorId}>{error}</FormError>
      <FormSuccess id={successId}>{success}</FormSuccess>
      <FormHelp id={helpId}>{helpText}</FormHelp>
    </FormField>
  )
}

export {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormTextarea,
  FormError,
  FormSuccess,
  FormHelp,
  FormFieldComplete
}