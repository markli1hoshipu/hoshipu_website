// src/components/ui/textarea.jsx
import * as React from "react"

import { cn } from "../../../lib/utils" // Ensure this path is correct for your utils.js

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // REMOVED: focus-visible:ring-2, focus-visible:ring-ring, focus-visible:ring-offset-2
        // Keeping focus-visible:outline-none as it's a good default
        "flex min-h-[80px] w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className // This 'className' comes from the props passed to Textarea, allowing further overrides
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }