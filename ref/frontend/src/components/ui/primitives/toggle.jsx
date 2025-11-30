import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cn } from "../../../lib/utils"

const toggleVariants = {
  default: "bg-transparent hover:bg-gray-100 hover:text-gray-500 data-[state=on]:bg-gray-100 data-[state=on]:text-gray-900",
  outline: "border border-gray-200 bg-transparent hover:bg-gray-100 hover:text-gray-900",
}

const Toggle = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      toggleVariants[variant],
      size === "default" && "h-10 px-3",
      size === "sm" && "h-9 px-2.5",
      size === "lg" && "h-11 px-5",
      className
    )}
    {...props}
  />
))
Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle }