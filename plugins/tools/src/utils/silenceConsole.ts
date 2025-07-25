// 在生产环境中关闭 console.log 输出，避免暴露调试信息
// 该文件应在各个入口文件最先导入。
// 由于部分打包工具的类型声明中未包含 env 字段，这里使用 "as any" 规避 TS 报错
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const envMode = (import.meta as any).env?.MODE || (import.meta as any).env?.NODE_ENV;

if (envMode !== 'development') {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, no-console
  console.log = () => {};
} 