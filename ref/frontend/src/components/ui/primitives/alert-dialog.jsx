import * as React from "react"
import { cn } from "../../../lib/utils"
import { Button } from "./button"

// Simple modal implementation without Radix UI
const AlertDialog = ({ children, open, onOpenChange }) => {
  // Only render content when modal is open
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 w-full max-w-lg mx-4">
        {React.Children.toArray(children).find(child =>
          child?.type?.displayName === 'AlertDialogContent'
        )}
      </div>
    </div>
  )
}

const AlertDialogTrigger = ({ children, onClick, ...props }) => (
  React.cloneElement(children, { 
    onClick: (e) => {
      onClick?.(e)
      children.props.onClick?.(e)
    },
    ...props 
  })
)

const AlertDialogContent = ({ className, children, ...props }) => (
  <div
    className={cn(
      "grid w-full gap-4 border bg-white p-6 shadow-lg rounded-lg",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

const AlertDialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

const AlertDialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)

const AlertDialogTitle = ({ className, ...props }) => (
  <h2
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
)

const AlertDialogDescription = ({ className, ...props }) => (
  <p
    className={cn("text-sm text-gray-600", className)}
    {...props}
  />
)

const AlertDialogAction = ({ className, ...props }) => (
  <Button
    className={className}
    {...props}
  />
)

const AlertDialogCancel = ({ className, ...props }) => (
  <Button
    variant="outline"
    className={cn("mt-2 sm:mt-0", className)}
    {...props}
  />
)

// Set display names for component identification
AlertDialogContent.displayName = 'AlertDialogContent'

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}