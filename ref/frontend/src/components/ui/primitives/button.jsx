import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "../../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 font-manrope",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 font-manrope",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-inter",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 font-inter",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground font-inter",
        ghost: "hover:bg-accent hover:text-accent-foreground font-inter",
        link: "text-primary underline-offset-4 hover:underline font-inter",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-6 py-3 text-base",
        icon: "h-10 w-10 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  asChild = false, 
  disabled = false,
  loading = false,
  loadingText,
  children,
  ...props 
}, ref) => {
  const Comp = asChild ? Slot : motion.button
  const isDisabled = disabled || loading
  
  const motionProps = !asChild && !isDisabled ? {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  } : {}
  
  // Import Spinner lazily to avoid circular dependency
  const Spinner = ({ size: spinnerSize = "sm" }) => {
    const sizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6"
    }
    return (
      <svg
        className={`${sizes[spinnerSize]} animate-spin`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )
  }
  
  const getSpinnerSize = () => {
    switch (size) {
      case 'sm': return 'sm'
      case 'lg': return 'md'
      default: return 'sm'
    }
  }
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      ref={ref}
      {...motionProps}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Spinner size={getSpinnerSize()} />
          <span>{loadingText || 'Loading...'}</span>
        </div>
      ) : (
        children
      )}
    </Comp>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }