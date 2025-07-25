/// <reference types="wxt/client" />

interface ImportMetaEnv {
  // WXT 内置环境变量
  readonly MANIFEST_VERSION: 2 | 3
  readonly BROWSER: string
  readonly CHROME: boolean
  readonly FIREFOX: boolean
  readonly SAFARI: boolean
  readonly EDGE: boolean
  readonly OPERA: boolean
  readonly MODE: string
  readonly PROD: boolean
  readonly DEV: boolean

}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 