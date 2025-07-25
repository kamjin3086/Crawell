import { ExtractorContext, ExtractResult, IContentExtractor } from '../interfaces/IContentExtractor';

export class ListExtractor implements IContentExtractor {
  name = 'ListExtractor';
  priority = 4;

  private processList = (list: HTMLElement, isNested: boolean = false): string => {
    const items = Array.from(list.children).filter(el => el.tagName === 'LI') as HTMLLIElement[];
    const indent = isNested ? '  ' : '';
    const marker = list.tagName === 'OL' ? '1.' : '-';
    
    return items.map(item => `${indent}${marker} ${this.processListItem(item)}`).join('\n');
  };

  private processListItem = (item: HTMLLIElement): string => {
    const text = item.textContent?.trim() || '';
    const nestedLists = Array.from(item.querySelectorAll(':scope > ul, :scope > ol'));
    
    let result = text;
    if (nestedLists.length > 0) {
      const nestedContent = nestedLists.map(list => this.processList(list as HTMLElement, true)).join('\n');
      result = `${text}\n${nestedContent}`;
    }
    return result;
  };

  async canExtract(context: ExtractorContext): Promise<boolean> {
    return context.element.querySelectorAll('ul, ol').length > 0;
  }

  async extract(context: ExtractorContext): Promise<ExtractResult> {
    const lists = Array.from(context.element.querySelectorAll('ul, ol'));
    if (lists.length === 0) {
      return { content: '', extracted: false };
    }

    const markdownLists = lists
      .filter(list => !list.parentElement?.closest('ul, ol')) // 只处理顶层列表
      .map(list => this.processList(list as HTMLElement))
      .join('\n\n');

    return {
      content: markdownLists,
      extracted: true,
      metadata: {
        listCount: lists.length
      }
    };
  }
} 