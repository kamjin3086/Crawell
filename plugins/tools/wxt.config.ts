import { defineConfig } from 'wxt';
import pkg from './package.json' assert { type: 'json' }

import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module", "@wxt-dev/auto-icons"],
  manifest: {
    name: 'Crawell',
    description: 'Crawell – All-in-one web asset extractor & knowledge organizer',
    default_locale: 'en',
    version: pkg.version,
    permissions: ['storage', 'tabs', 'scripting'],
    host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_popup: 'popup.html'
    },
    web_accessible_resources: [
      {
        // Resources must reference the actual file paths contained in the packaged
        // extension. During build, WXT flattens HTML entrypoints to the root
        // directory (e.g. `help/index.html` becomes `help.html`).
        // Using the flattened names prevents Edge Add-ons validation errors
        // like "Manifest file reference ... does not exist in the zip archive".
        resources: [
          'help.html',
          'privacy.html',
          'terms.html',
          'welcome.html',
        ],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    // @ts-ignore - tailwindcss vite plugin accepts config arg though typings omit it
    plugins: [tailwindcss({ config: '../../tailwind.config.ts' })],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {},
      },
    },
  }),
  // @ts-ignore: outdated types for content_security
  content_security: {
    extension_pages:
      "default-src 'self'; img-src 'self' data: blob: https: http:; style-src 'self' 'unsafe-inline'; font-src 'self';",
  },
  webExt: {
    chromiumArgs: [
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
    ],
  }
});
