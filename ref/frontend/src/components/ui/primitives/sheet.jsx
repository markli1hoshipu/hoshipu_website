import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = ({ open, onOpenChange, children }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setIsVisible(true)
      setIsClosing(false)
      document.body.style.overflow = 'hidden'
    } else if (isVisible) {
      setIsClosing(true)
      // Delay removal to allow exit animation
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, 300) // Match transition duration
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open, isVisible])

  if (!isVisible) return null

  const handleBackdropClick = () => {
    if (!isClosing) {
      onOpenChange(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleBackdropClick}
      />
      {React.Children.map(children, child =>
        React.cloneElement(child, { isClosing })
      )}
    </>
  )
}

const SheetContent = React.forwardRef(
  ({ side = "right", className, children, isClosing, ...props }, ref) => {
    const [isEntering, setIsEntering] = React.useState(true)

    React.useEffect(() => {
      // Trigger entrance animation after mount
      const timer = setTimeout(() => {
        setIsEntering(false)
      }, 10)
      return () => clearTimeout(timer)
    }, [])

    const getTransformClass = () => {
      if (side === "right") {
        if (isClosing) return "translate-x-full"
        if (isEntering) return "translate-x-full"
        return "translate-x-0"
      }
      if (side === "left") {
        if (isClosing) return "-translate-x-full"
        if (isEntering) return "-translate-x-full"
        return "translate-x-0"
      }
      if (side === "top") {
        if (isClosing) return "-translate-y-full"
        if (isEntering) return "-translate-y-full"
        return "translate-y-0"
      }
      if (side === "bottom") {
        if (isClosing) return "translate-y-full"
        if (isEntering) return "translate-y-full"
        return "translate-y-0"
      }
      return "translate-x-0"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "fixed z-50 bg-white shadow-lg transition-transform duration-300 ease-in-out",
          side === "right" ? "right-0 top-0 h-full border-l p-6" : "",
          side === "left" ? "left-0 top-0 h-full border-r p-6" : "",
          side === "top" ? "top-0 left-0 w-full border-b p-6" : "",
          side === "bottom" ? "bottom-0 left-0 w-full border-t p-6" : "",
          getTransformClass(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left mb-4",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"

const SheetClose = ({ className, onClick, ...props }) => (
  <button
    className={cn(
      "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none",
      className
    )}
    onClick={onClick}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </button>
)

export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
}
