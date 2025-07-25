# Crawell Tools

> **Crawell – 网页素材提取器 / Markdown 转换侧边栏扩展**
>
> 本目录为浏览器扩展子包（WXT 构建），主要负责图片提取、Markdown 转换等核心功能。若需整体仓库概览，请查看根目录 `README.md`。

## Building From Source (for Mozilla Add-on Reviewers)

This repository is split into two workspaces.  The Firefox extension you are
currently reviewing lives in `plugins/tools/` (folder you are reading).  All
necessary source files are present here – **nothing is minified or transpiled**.

### 1. Prerequisites

| Tool | Recommended Version |
|------|---------------------|
| Node.js | ≥ 18.x LTS |
| pnpm   | ≥ 8.x             |
| Git    | any (only if cloning) |
| OS     | Windows / macOS / Linux – no special requirements |

> No global binaries besides **Node + pnpm** are required.  The build script
> will install every JavaScript dependency inside `node_modules`.

### 2. Install dependencies

```bash
# In this folder (extension root)
pnpm install
```

### 3. Build a **Firefox** production bundle (WXT native command)

```bash
# Build for Firefox
pnpm run build:tools:firefox
```

The build output will be located at:

```
.output/firefox-mv2/
```

It already contains a signed `manifest.json`, compiled JavaScript chunks,
locale files, assets, etc.

### 4. (Optional) Generate a distributable ZIP/XPI

```bash

# optional ZIP
pnpm run zip:tools:firefox
```

The resulting archive can be uploaded directly to AMO.

### 5. Running the extension locally

```bash
# Live-reload dev server
pnpm run dev:tools:firefox
```

Finally, load `.output/firefox-mv2` as a temporary add-on via
`about:debugging#/runtime/this-firefox` → “Load Temporary Add-on”.

### 6. Build system internals

* **WXT** – wrapper around Vite that emits Web-Extension manifests.
* **Vite** & **esbuild** – handle TypeScript compilation and bundling.
* **Tailwind CSS** – compiled at build time; no CDN requests.
* **React 18** – used at run-time; the minimized copy in output is produced by
  Vite’s Rollup pipeline.

No other code generators / template engines run at install or run-time.

---

## 功能一览

| 功能 | 说明 |
| ---- | ---- |
| 图片提取 | 一键抓取当前网页图片，自动分类（ICON / THUMBNAIL / CONTENT / LARGE），支持尺寸 / 体积 / 格式过滤 |
| 批量下载 | 选中图片打包 ZIP 或单图下载，支持自动重命名、压缩质量、尺寸调整 |
| Markdown 转换 | 将网页正文解析为 Markdown，保留标题层级、列表、代码块等格式 |
| Markdown 编辑器 | 支持编辑 / 预览、搜索高亮、字数统计、一键复制、打包下载（含图片） |
| 自动提取 | 可在切换页面时自动执行图片 / Markdown 提取 |
| 持久化设置 | 使用浏览器 `storage.local`（通过 WXT API）保存用户选项、过滤器等 |
| i18n | 内建中 / 英文翻译，可通过设置切换语言 |

## 目录结构

```
plugins/tools/
├─ entrypoints/       # 扩展入口（background / content / sidepanel / privacy / terms / help）
├─ locales/           # i18n YML（Chrome 会在构建时转换为 _locales/*）
├─ assets/            # 公共静态资源（图标、Tailwind 样式、SVG 等）
├─ src/
│  ├─ components/     # React 组件（UI、业务组件）
│  ├─ imageExtractor/ # 图片提取核心逻辑
│  ├─ markdownExtractor/ # Markdown 提取器框架
│  ├─ store/          # Zustand 状态管理
│  ├─ hooks/          # 通用 / 业务 hooks
│  └─ utils/          # 工具函数
└─ wxt.config.ts      # WXT 构建配置
```

## 快速开始

```bash
# 安装依赖（根目录执行）
pnpm install

# 开发模式（Chrome，自动打开扩展）
cd plugins/tools
pnpm dev

# Firefox 预览
pnpm dev:firefox        # 在 package.json scripts 可自行添加

# 生产构建 + 打包 zip
pnpm build              # 生成 .output/chrome-mv3
pnpm zip                # 生成扩展 zip 包
```

> 构建命令由 [WXT](https://wxt.dev/) 提供，自动处理 Manifest、Tailwind、i18n、图标等。

## 版本规范

- **语义化版本**：`MAJOR.FEATURE.PATCH`，示例 `0.9.0`
- 每次发布请同步修改：
  - `plugins/tools/package.json` → `version`
  - `plugins/tools/wxt.config.ts` → `version` 环境变量（如有）
  - `manifest.json`（由 WXT 自动生成，无需手动改）

## 发布前检查

1. `pnpm test` / `pnpm compile` / `pnpm lint` 全绿
2. `console.log` 已在生产环境通过 `src/utils/silenceConsole.ts` 自动禁用
3. 隐私政策 & 使用条款文本位于 `locales/`，保持中 / 英同步
4. 商店截图 / GIF 位于 `docs/store-assets/<version>`（见根目录文档）
5. 运行 `pnpm zip` 生成文件，手动加载测试

## 许可证

MIT © Crawell Team 