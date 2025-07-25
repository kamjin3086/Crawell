import { ExtractorContext, ExtractResult, IContentExtractor } from '../interfaces/IContentExtractor';
import { ExtractorLogger } from '../utils/ExtractorLogger';
import { TurndownConverter } from '../utils/TurndownConverter';

export class GenericExtractor implements IContentExtractor {
  name = 'GenericExtractor';
  priority = 10; // 最低优先级，作为后备提取器
  private converter: TurndownConverter;

  constructor() {
    this.converter = new TurndownConverter();
  }

  async canExtract(context: ExtractorContext): Promise<boolean> {
    return true; // 总是可以提取
  }

  private getSelectorsToRemove(options: ExtractorContext['options']): string[] {
    // 最小移除集合：只去除页面不可见且无内容价值的标签
    const selectors: string[] = [
      'script',
      'style',
      'link[rel="stylesheet"]',
      'meta',
      'iframe',
      'noscript'
    ];

    // 若未开启 cleanMode，直接返回最小集合（保证"原样模式"尽量 1:1）
    if (!options?.cleanMode) return selectors;

    // 以下为清爽模式额外移除
    selectors.push(
      'svg',
      '[aria-hidden="true"]',
      '.hidden',
      '[style*="display: none"]',
      '[style*="visibility: hidden"]',
      'comment',
      '#toc',
      '.toc'
    );

    if (options.removeAds) {
      selectors.push(
        '[class*="ad-"]',
        '[class*="advertisement"]',
        '[class*="banner"]',
        '[id*="ad-"]'
      );
    }

    if (options.removeNav) {
      selectors.push(
        'nav',
        '[role="navigation"]'
      );
    }

    if (options.removeFooter) {
      selectors.push('footer');
    }

    if (options.removeComments) {
      selectors.push('[class*="comment"]');
    }

    if (options.removeSocial) {
      selectors.push(
        '[class*="share"]',
        '[class*="social"]'
      );
    }

    return selectors;
  }

  private cleanupElement(element: HTMLElement, options: ExtractorContext['options']): HTMLElement {
    const cleanElement = element.cloneNode(true) as HTMLElement;
    
    // 移除HTML注释节点
    this.removeComments(cleanElement);
    
    const selectorsToRemove = this.getSelectorsToRemove(options);

    ExtractorLogger.debug(this.name, '清理元素前的状态', {
      originalLength: cleanElement.innerHTML.length,
      cleanMode: options?.cleanMode,
      selectorsToRemove
    });

    cleanElement.querySelectorAll(selectorsToRemove.join(',')).forEach(el => {
      ExtractorLogger.debug(this.name, `移除元素: ${el.tagName}`, {
        class: el.className,
        id: el.id
      });
      el.remove();
    });

    // 处理图片的srcset和data-src
    cleanElement.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || 
                 img.getAttribute('data-src') || 
                 img.getAttribute('data-original') ||
                 img.getAttribute('srcset')?.split(',')[0]?.split(' ')[0];
      if (src) {
        img.setAttribute('src', src);
      }
    });

    // 处理代码块
    cleanElement.querySelectorAll('pre, code').forEach(codeEl => {
      const classNames = codeEl.className.split(' ');
      const languageClass = classNames.find(cls => 
        cls.startsWith('language-') || 
        cls.startsWith('lang-') ||
        cls.startsWith('hljs-')
      );
      if (languageClass) {
        codeEl.className = languageClass;
      }
    });

    // 只在清爽模式下移除空白节点
    if (options?.cleanMode) {
      this.removeEmptyNodes(cleanElement);
    }

    // 最后再次检查并移除可能残留的注释
    this.removeComments(cleanElement);

    ExtractorLogger.debug(this.name, '清理元素后的状态', {
      cleanedLength: cleanElement.innerHTML.length
    });

    return cleanElement;
  }

  private removeEmptyNodes(element: HTMLElement) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    const nodesToRemove: Element[] = [];
    let node = walker.nextNode() as Element;

    while (node) {
      if (this.isEmptyNode(node)) {
        nodesToRemove.push(node);
      }
      node = walker.nextNode() as Element;
    }

    nodesToRemove.forEach(node => {
      ExtractorLogger.debug(this.name, `移除空节点: ${node.tagName}`, {
        class: node.className,
        id: node.id
      });
      node.remove();
    });
  }

  private isEmptyNode(node: Element): boolean {
    // 检查节点是否为空（没有文本内容和有效的子元素）
    const text = node.textContent?.trim() || '';
    const hasImages = node.querySelector('img') !== null;
    const hasLinks = node.querySelector('a') !== null;
    const hasLists = node.querySelector('ul, ol') !== null;
    const hasTables = node.querySelector('table') !== null;
    
    return text === '' && !hasImages && !hasLinks && !hasLists && !hasTables;
  }

  private findMainContent(element: HTMLElement): HTMLElement {
    // 只在清爽模式下寻找主要内容区域
    if (!element.ownerDocument?.defaultView) {
      return element;
    }

    // 尝试找到主要内容区域
    const mainContentSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.main-content',
      '.article-content',
      '.post-content',
      '#content',
      '.content'
    ];

    for (const selector of mainContentSelectors) {
      const mainContent = element.querySelector(selector);
      if (mainContent && mainContent.textContent?.trim()) {
        ExtractorLogger.info(this.name, `找到主要内容区域: ${selector}`);
        return mainContent as HTMLElement;
      }
    }

    ExtractorLogger.warn(this.name, '未找到明确的主要内容区域，使用整个文档');
    return element;
  }

  private removeComments(element: HTMLElement) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_COMMENT,
      null
    );

    const commentsToRemove: Comment[] = [];
    let comment = walker.nextNode() as Comment;

    while (comment) {
      commentsToRemove.push(comment);
      comment = walker.nextNode() as Comment;
    }

    commentsToRemove.forEach(comment => {
      ExtractorLogger.debug(this.name, '移除HTML注释', {
        commentContent: comment.textContent
      });
      comment.remove();
    });

    // 注释节点已移除，无需再次通过 innerHTML 重写。
  }

  async extract(context: ExtractorContext): Promise<ExtractResult> {
    try {
      ExtractorLogger.info(this.name, '开始通用内容提取', {
        cleanMode: context.options?.cleanMode
      });

      // 如果有选中内容，优先处理选中内容
      if (context.selection && context.selection.rangeCount > 0) {
        const range = context.selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        ExtractorLogger.debug(this.name, '处理选中内容', {
          contentLength: tempDiv.innerHTML.length
        });
        
        const cleanedDiv = this.cleanupElement(tempDiv, context.options);
        const markdown = this.converter.convertFromElement(cleanedDiv, !!context.options?.cleanMode);
        
        return {
          content: markdown,
          extracted: true,
          metadata: {
            source: 'selection',
            originalLength: tempDiv.innerHTML.length,
            cleanedLength: cleanedDiv.innerHTML.length,
            cleanMode: context.options?.cleanMode
          }
        };
      }

      // 处理整个文档
      const mainContent = context.options?.cleanMode 
        ? this.findMainContent(context.element)
        : context.element;
        
      // TurndownConverter 内部会根据 cleanMode 决定是否使用 Readability
      const cleanedContent = this.cleanupElement(mainContent, context.options);

      const markdown = this.converter.convertFromElement(cleanedContent, !!context.options?.cleanMode);
      
      ExtractorLogger.info(this.name, '通用内容提取完成', {
        outputLength: markdown.length
      });

      return {
        content: markdown,
        extracted: true,
        metadata: {
          source: 'mainContent',
          originalLength: mainContent.innerHTML.length,
          cleanedLength: cleanedContent.innerHTML.length,
          cleanMode: context.options?.cleanMode
        }
      };
    } catch (error) {
      ExtractorLogger.error(this.name, '通用内容提取失败', error);
      return {
        content: '',
        extracted: false,
        metadata: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }
} 