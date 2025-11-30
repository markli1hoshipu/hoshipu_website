import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../../lib/utils"

// Enhanced Select implementation using native HTML select with modern styling
const Select = ({ children, value, onValueChange, className, size = "default", ...props }) => {
  const sizeClasses = {
    sm: "h-8 px-2 py-1 text-xs pr-6",
    default: "h-9 px-3 py-2 text-sm pr-8",
    lg: "h-10 px-4 py-2 text-base pr-10"
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm transition-all duration-200",
          "hover:border-slate-300 hover:bg-slate-50",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          "appearance-none cursor-pointer",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className={cn(
        "absolute right-2 top-1/2 transform -translate-y-1/2 opacity-50 pointer-events-none transition-transform duration-200",
        size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
      )} />
    </div>
  )
}

const SelectContent = ({ children, ...props }) => children

const SelectItem = ({ children, value, ...props }) => (
  <option value={value} {...props}>
    {children}
  </option>
)

const SelectTrigger = ({ className, children, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
)

const SelectValue = ({ placeholder, ...props }) => null // Not needed for native select

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}