import { ExtractorContext, ExtractResult, IContentExtractor } from '../interfaces/IContentExtractor';

export class CodeExtractor implements IContentExtractor {
  name = 'CodeExtractor';
  priority = 3;

  async canExtract(context: ExtractorContext): Promise<boolean> {
    // 仅当页面包含 <pre> 代码块时才启用，避免把行内 <code> 元素当作独立代码块
    return context.element.querySelectorAll('pre').length > 0;
  }

  async extract(context: ExtractorContext): Promise<ExtractResult> {
    // 仅提取 <pre> 代码块，防止将行内 <code> 误处理为单独代码段
    const codeElements = Array.from(context.element.querySelectorAll('pre'));
    if (codeElements.length === 0) {
      return { content: '', extracted: false };
    }

    const codeBlocks = codeElements.map(element => {
      // 尝试从 <pre> 或其子 <code> 标签的 class 名称中提取语言信息
      const targetEl = element.querySelector('code') || element;
      const classNames = (targetEl.className || '').split(' ');
      const languageClass = classNames.find(cls => 
        cls.startsWith('language-') || 
        cls.startsWith('lang-') ||
        cls.startsWith('hljs-')
      );
      
      let language = '';
      if (languageClass) {
        language = languageClass.split('-')[1];
      }

      const code = targetEl.textContent || '';
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    }).join('\n\n');

    return {
      content: codeBlocks,
      extracted: true,
      metadata: {
        codeBlockCount: codeElements.length
      }
    };
  }
} 