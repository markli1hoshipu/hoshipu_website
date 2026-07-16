import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, onWheel, ...props }: React.ComponentProps<"input">) {
  // 数字输入框在聚焦时，鼠标滚轮会意外增减数值（常见于金额输入）。
  // 滚动时让其失焦，把滚动交还给页面，从而“仅数字输入但不响应滚轮”。
  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLInputElement>) => {
      if (type === "number") {
        event.currentTarget.blur();
      }
      onWheel?.(event);
    },
    [type, onWheel]
  );

  return (
    <input
      type={type}
      onWheel={handleWheel}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
