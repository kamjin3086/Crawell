import { BaseMarkdownExtractor } from '../base/BaseMarkdownExtractor';
import { ExtractorOptions } from '../interfaces/IContentExtractor';
import { ChatContextExtractorManager } from '../core/ChatContextExtractorManager';

export class ChatMarkdownExtractor extends BaseMarkdownExtractor {
  private extractorManager: ChatContextExtractorManager;

  constructor() {
    super('ChatMarkdownExtractor');
    this.extractorManager = new ChatContextExtractorManager();
  }

  async canHandle(element: HTMLElement): Promise<boolean> {
    // 检查是否为聊天内容（可以根据具体需求实现判断逻辑）
    return element.classList.contains('chat-content') || 
           element.querySelector('.chat-message') !== null;
  }

  protected async doExtract(element: HTMLElement, options?: ExtractorOptions): Promise<string> {
    return this.extractorManager.extract(element, undefined, options);
  }
} 