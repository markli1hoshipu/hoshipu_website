import * as React from "react"
import { cn } from "../../../lib/utils"

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => {
  // Ensure value is a valid number and log any issues
  const sanitizedValue = (() => {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      console.warn('⚠️ Progress component received NaN value:', value, 'defaulting to 0');
      return 0;
    }
    return Math.max(0, Math.min(100, numValue));
  })();

  return (
    <div
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out rounded-full"
        style={{ width: `${sanitizedValue}%` }}
      />
    </div>
  );
})
Progress.displayName = "Progress"

export { Progress }