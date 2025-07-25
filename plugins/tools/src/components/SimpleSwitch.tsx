import React from 'react'

interface SimpleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}

/**
 * 一款使用原生 <input type="checkbox"> 的轻量开关，Tailwind 样式。
 */
export const SimpleSwitch: React.FC<SimpleSwitchProps> = ({ checked, onChange, id }) => (
  <label htmlFor={id} className="inline-flex items-center cursor-pointer relative select-none">
    <input
      id={id}
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    {/* Track */}
    <span
      className="w-9 h-5 rounded-full transition-colors bg-slate-300 dark:bg-slate-600 peer-checked:bg-blue-600 peer-checked:dark:bg-blue-500"
    />
    {/* Thumb */}
    <span
      className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white dark:bg-slate-100 shadow transition-transform peer-checked:translate-x-4"
    />
  </label>
) 