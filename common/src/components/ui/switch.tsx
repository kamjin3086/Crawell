import * as React from "react"
import { cn } from '../../lib/utils'

// Size variants
const SIZE_VARIANTS = {
  md: {
    root: "h-6 w-11",
    thumb: "h-5 w-5",
    translate: "peer-checked:translate-x-5",
  },
  sm: {
    root: "h-5 w-9",
    thumb: "h-4 w-4",
    translate: "peer-checked:translate-x-4",
  },
} as const

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: keyof typeof SIZE_VARIANTS
}

/**
 * 原生实现的轻量级 Switch 组件，使用 `input[type=checkbox]` + Tailwind。
 */
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ variant = 'md', className, disabled, ...props }, ref) => {
    const variantStyle = SIZE_VARIANTS[variant]

    return (
      <label
        className={cn(
          "relative inline-flex items-center cursor-pointer select-none",
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* hidden checkbox */}
        <input
          type="checkbox"
          ref={ref}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        {/* track */}
        <span
    className={cn(
            "transition-colors rounded-full bg-slate-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500",
            variantStyle.root,
      className
    )}
        />
        {/* thumb */}
        <span
      className={cn(
            "absolute left-0.5 top-0.5 rounded-full bg-white shadow transition-transform",
            variantStyle.thumb,
            variantStyle.translate
      )}
    />
      </label>
    )
  }
)
Switch.displayName = 'Switch' 