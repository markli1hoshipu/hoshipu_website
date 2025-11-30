import * as React from "react"
import { cn } from "../../../lib/utils"
import { X } from "lucide-react"

// Context for Dialog state management
const DialogContext = React.createContext()

// Simple modal implementation without Radix UI
const Dialog = ({ children, open, onOpenChange }) => {
  // Only render content when modal is open
  if (!open) return null;

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange?.(false)}
        />
        {React.Children.toArray(children).find(child =>
          child?.type?.displayName === 'DialogContent'
        )}
      </div>
    </DialogContext.Provider>
  )
}

const DialogTrigger = ({ children, onClick, ...props }) => (
  React.cloneElement(children, {
    onClick: (e) => {
      onClick?.(e)
      children.props.onClick?.(e)
    },
    ...props
  })
)

const DialogContent = ({ className, children, onClose, ...props }) => {
  const context = React.useContext(DialogContext)

  const handleClose = () => {
    // Call parent Dialog's onOpenChange for proper state management
    context?.onOpenChange?.(false)
    // Keep onClose for backward compatibility
    onClose?.()
  }

  return (
    <div
      className={cn(
        "grid w-full gap-4 border bg-white p-6 shadow-lg rounded-lg relative",
        className
      )}
      {...props}
    >
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
      {children}
    </div>
  )
}

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)

const DialogTitle = ({ className, ...props }) => (
  <h2
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
)

const DialogDescription = ({ className, ...props }) => (
  <p
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
)

// Set display names for component identification
DialogContent.displayName = 'DialogContent'

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
