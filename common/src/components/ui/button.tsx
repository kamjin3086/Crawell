import * as React from "react"
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            ...(variant === "default"
              ? disabled
                ? { "bg-slate-200 text-slate-400": true }
                : { "bg-blue-500 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90": true }
              : {}),
            "bg-red-500 text-white hover:bg-red-600": variant === "destructive" && !disabled,
            "border border-gray-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-700/50 dark:hover:text-white":
              variant === "outline" && !disabled,
            ...(variant === "outline" && disabled
              ? {
                  "border border-gray-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500":
                    true,
                }
              : {}),
            "bg-slate-100 text-slate-900 hover:bg-slate-200": variant === "secondary",
            "hover:bg-slate-100 hover:text-slate-900": variant === "ghost",
            "text-blue-500 underline-offset-4 hover:underline": variant === "link",
          },
          {
            "h-9 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button } 