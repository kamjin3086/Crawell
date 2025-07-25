import type { Config } from 'tailwindcss'
import { join } from 'node:path'
import animate from 'tailwindcss-animate'

const projectRoot = __dirname

const config: Config = {
  darkMode: 'class',
  content: {
    files: [
      join(projectRoot, 'plugins/**/*.{html,js,ts,jsx,tsx}'),
      join(projectRoot, 'common/src/**/*.{js,ts,jsx,tsx}'),
    ],
    relative: false,
  },
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
      },
    },
  },
  plugins: [animate],
}

export default config 