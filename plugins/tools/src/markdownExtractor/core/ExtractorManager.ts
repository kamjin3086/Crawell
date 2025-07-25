import { ExtractorContext, ExtractResult, IContentExtractor, ExtractorOptions } from '../interfaces/IContentExtractor';
import { ImageExtractor } from '../extractors/ImageExtractor';
import { ListExtractor } from '../extractors/ListExtractor';
import { GenericExtractor } from '../extractors/GenericExtractor';
import { ExtractorLogger } from '../utils/ExtractorLogger';

export class ExtractorManager {
  private extractors: IContentExtractor[];
  private processedNodes: Set<Node> = new Set();

  constructor() {
    // 移除 CodeExtractor，直接由 GenericExtractor 处理 <pre><code> 块，避免代码块被提取到正文前且造成重复
    this.extractors = [
      new ImageExtractor(),
      new ListExtractor(),
      new GenericExtractor(),
    ].sort((a, b) => a.priority - b.priority);

    ExtractorLogger.info('ExtractorManager', '初始化提取器列表', 
      this.extractors.map(e => `${e.name}(优先级:${e.priority})`));
  }

  async extract(element: HTMLElement, selection?: Selection | null, options?: ExtractorOptions): Promise<string> {
    ExtractorLogger.info('ExtractorManager', '开始提取内容', {
      elementTag: element.tagName,
      hasSelection: !!selection,
      options
    });

    this.processedNodes.clear(); // 重置已处理节点集合
    
    const context: ExtractorContext = {
      element,
      selection,
      originalUrl: window.location.href,
      options
    };

    const results: ExtractResult[] = [];

    try {
      // 并行运行所有提取器的canExtract检查
      const extractorChecks = await Promise.all(
        this.extractors.map(async extractor => {
          try {
            const canExtract = await extractor.canExtract(context);
            ExtractorLogger.debug('ExtractorManager', `检查提取器 ${extractor.name}`, {
              canExtract,
              priority: extractor.priority
            });
            return { extractor, canExtract };
          } catch (error) {
            ExtractorLogger.error('ExtractorManager', `提取器${extractor.name}检查失败`, error);
            return { extractor, canExtract: false };
          }
        })
      );

      // 按优先级顺序执行可用的提取器
      for (const { extractor, canExtract } of extractorChecks) {
        if (canExtract) {
          ExtractorLogger.info('ExtractorManager', `使用提取器 ${extractor.name} 提取内容`);
          try {
            const result = await extractor.extract(context);
            if (result.extracted && result.content.trim()) {
              ExtractorLogger.debug('ExtractorManager', `提取器 ${extractor.name} 提取成功`, {
                contentLength: result.content.length,
                metadata: result.metadata
              });
              results.push({
                ...result,
                metadata: {
                  ...result.metadata,
                  extractorName: extractor.name
                }
              });
            } else {
              ExtractorLogger.warn('ExtractorManager', `提取器 ${extractor.name} 未提取到内容`);
            }
          } catch (error) {
            ExtractorLogger.error('ExtractorManager', `提取器 ${extractor.name} 提取失败`, error);
          }
        }
      }

      const mergedContent = this.mergeResults(results);
      ExtractorLogger.info('ExtractorManager', '内容提取完成', {
        extractorsUsed: results.length,
        totalContentLength: mergedContent.length,
        cleanMode: options?.cleanMode
      });

      return mergedContent;
    } catch (error) {
      ExtractorLogger.error('ExtractorManager', '内容提取过程发生错误', error);
      throw error;
    }
  }

  private mergeResults(results: ExtractResult[]): string {
    ExtractorLogger.debug('ExtractorManager', '开始合并结果', {
      resultCount: results.length
    });

    // 按提取器优先级排序结果
    const sortedResults = results.sort((a, b) => {
      const extractorA = this.extractors.find(e => e.name === a.metadata?.extractorName);
      const extractorB = this.extractors.find(e => e.name === b.metadata?.extractorName);
      return (extractorA?.priority || 0) - (extractorB?.priority || 0);
    });

    // 移除重复内容
    const uniqueContents = new Set<string>();
    const filteredResults = sortedResults.filter(result => {
      const content = result.content.trim();
      if (uniqueContents.has(content)) {
        ExtractorLogger.warn('ExtractorManager', `发现重复内容，来自提取器 ${result.metadata?.extractorName}`);
        return false;
      }
      uniqueContents.add(content);
      return true;
    });

    const finalContent = filteredResults
      .map(result => result.content)
      .filter(content => content.trim().length > 0)
      .join('\n\n');

    ExtractorLogger.debug('ExtractorManager', '结果合并完成', {
      originalCount: results.length,
      uniqueCount: filteredResults.length,
      finalLength: finalContent.length
    });

    return finalContent;
  }
} 