import { ExtractorContext, ExtractResult, IContentExtractor, ExtractorOptions } from '../interfaces/IContentExtractor';
import { ChatMessageExtractor } from '../extractors/ChatMessageExtractor';
import { ChatContextExtractor } from '../extractors/ChatContextExtractor';
import { ExtractorLogger } from '../utils/ExtractorLogger';

export class ChatContextExtractorManager {
  private extractors: IContentExtractor[];

  constructor() {
    // 按优先级排序的提取器列表
    this.extractors = [
      new ChatMessageExtractor(),
      new ChatContextExtractor(),
    ].sort((a, b) => a.priority - b.priority);

    ExtractorLogger.info('ChatContextExtractorManager', '初始化聊天内容提取器列表', 
      this.extractors.map(e => `${e.name}(优先级:${e.priority})`));
  }

  async extract(element: HTMLElement, selection?: Selection | null, options?: ExtractorOptions): Promise<string> {
    ExtractorLogger.info('ChatContextExtractorManager', '开始提取聊天内容', {
      elementTag: element.tagName,
      hasSelection: !!selection,
      options
    });

    const context: ExtractorContext = {
      element,
      selection,
      originalUrl: window.location.href,
      options: {
        ...options,
        preserveFormatting: true, // 保留聊天格式
        includeMetadata: true,    // 包含元数据
      }
    };

    const results: ExtractResult[] = [];

    try {
      // 并行运行所有提取器的canExtract检查
      const extractorChecks = await Promise.all(
        this.extractors.map(async extractor => {
          try {
            const canExtract = await extractor.canExtract(context);
            return { extractor, canExtract };
          } catch (error) {
            ExtractorLogger.error('ChatContextExtractorManager', `提取器${extractor.name}检查失败`, error);
            return { extractor, canExtract: false };
          }
        })
      );

      // 按优先级顺序执行可用的提取器
      for (const { extractor, canExtract } of extractorChecks) {
        if (canExtract) {
          try {
            const result = await extractor.extract(context);
            if (result.extracted && result.content.trim()) {
              results.push(result);
            }
          } catch (error) {
            ExtractorLogger.error('ChatContextExtractorManager', `提取器 ${extractor.name} 提取失败`, error);
          }
        }
      }

      const mergedContent = this.mergeResults(results);
      return mergedContent;
    } catch (error) {
      ExtractorLogger.error('ChatContextExtractorManager', '聊天内容提取过程发生错误', error);
      throw error;
    }
  }

  private mergeResults(results: ExtractResult[]): string {
    // 按时间顺序合并聊天内容
    return results
      .sort((a, b) => {
        const timeA = a.metadata?.timestamp || 0;
        const timeB = b.metadata?.timestamp || 0;
        return timeA - timeB;
      })
      .map(result => result.content)
      .filter(content => content.trim().length > 0)
      .join('\n\n');
  }
} 