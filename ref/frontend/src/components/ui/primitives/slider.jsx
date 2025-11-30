import * as React from "react"
import { cn } from "../../../lib/utils"

const Slider = React.forwardRef(({ className, value = [0], min = 0, max = 100, step = 1, onValueChange, ...props }, ref) => {
  const currentValue = value[0] || 0;
  
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value);
    onValueChange?.([newValue]);
  };

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentValue - min) / (max - min) * 100}%, #e5e7eb ${(currentValue - min) / (max - min) * 100}%, #e5e7eb 100%)`
        }}
        {...props}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }