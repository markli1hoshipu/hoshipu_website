import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../../lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <div className="relative">
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className="sr-only"
      {...props}
    />
    <div
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 bg-white cursor-pointer transition-colors",
        "hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked && "bg-blue-600 border-blue-600 text-white",
        className
      )}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {checked && (
        <div className="flex items-center justify-center text-current">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }