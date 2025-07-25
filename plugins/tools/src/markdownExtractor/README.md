# Markdown提取器模块

## 目录结构

```
markdownExtractor/
├── interfaces/          # 接口定义
│   ├── IMarkdownExtractor.ts
│   └── IContentExtractor.ts
├── base/               # 基础类
│   └── BaseMarkdownExtractor.ts
├── core/               # 核心实现
│   ├── ExtractorManager.ts
│   └── ChatContextExtractorManager.ts
├── extractors/         # 具体提取器实现
│   ├── WebPageMarkdownExtractor.ts
│   └── ChatMarkdownExtractor.ts
├── utils/             # 工具类
│   └── ExtractorLogger.ts
└── MarkdownExtractorFactory.ts  # 工厂类
```

## 模块说明

### 核心概念
- `IMarkdownExtractor`: Markdown提取器接口
- `BaseMarkdownExtractor`: 提取器基类，实现通用逻辑
- `MarkdownExtractorFactory`: 提取器工厂，负责创建合适的提取器实例

### 提取器类型
1. `WebPageMarkdownExtractor`: 网页内容提取器
   - 用于提取普通网页内容
   - 支持清理模式
   - 可配置提取选项

2. `ChatMarkdownExtractor`: 聊天内容提取器
   - 专门用于提取聊天内容
   - 保留聊天上下文
   - 支持特殊格式化

### 使用方式
```typescript
// 获取合适的提取器
const extractor = await MarkdownExtractorFactory.getExtractor(element);

// 提取内容
const markdown = await extractor.extractToMarkdown(element, options);
``` 