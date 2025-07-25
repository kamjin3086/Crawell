import { ExtractorOptions } from './IContentExtractor';

export interface IMarkdownExtractor {
  /**
   * 提取HTML内容为Markdown格式
   * @param element 要提取的HTML元素
   * @param options 提取选项
   */
  extractToMarkdown(element: HTMLElement, options?: ExtractorOptions): Promise<string>;
  
  /**
   * 获取提取器名称
   */
  getName(): string;
  
  /**
   * 检查是否可以处理该类型的内容
   */
  canHandle(element: HTMLElement): Promise<boolean>;
} 