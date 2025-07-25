import { ExtractorContext, ExtractResult, IContentExtractor } from '../interfaces/IContentExtractor';

export class ChatMessageExtractor implements IContentExtractor {
  readonly name = 'ChatMessageExtractor';
  readonly priority = 1;

  async canExtract(context: ExtractorContext): Promise<boolean> {
    const { element } = context;
    return element.classList.contains('chat-message') || 
           element.querySelector('.chat-message') !== null;
  }

  async extract(context: ExtractorContext): Promise<ExtractResult> {
    const { element } = context;
    const messages = Array.from(element.querySelectorAll('.chat-message'));
    
    if (messages.length === 0) {
      return { extracted: false, content: '' };
    }

    const extractedContent = messages.map(message => {
      const sender = message.querySelector('.sender')?.textContent?.trim() || '';
      const timestamp = message.querySelector('.timestamp')?.textContent?.trim() || '';
      const content = message.querySelector('.content')?.textContent?.trim() || '';
      
      return {
        content: `**${sender}** (${timestamp}):\n${content}`,
        timestamp: new Date(timestamp).getTime()
      };
    });

    const sortedContent = extractedContent
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => item.content)
      .join('\n\n');

    return {
      extracted: true,
      content: sortedContent,
      metadata: {
        messageCount: messages.length,
        type: 'chat'
      }
    };
  }
} 