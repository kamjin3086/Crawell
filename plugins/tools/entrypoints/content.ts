import { MarkdownExtractorFactory } from '../src/markdownExtractor/MarkdownExtractorFactory';
import { ImageExtractor } from '../src/imageExtractor/ImageExtractor';
import '../src/utils/silenceConsole';

// 声明由 WXT 注入的 defineContentScript，全局可用
/**
 * WXT 在构建时会注入 defineContentScript，这里显式声明以通过 TS 检查。
 * 具体类型可根据需要再细化。
 */
declare const defineContentScript: (options: {
  matches: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  main: (ctx: any) => void;
}) => void;

declare global {
  interface Window {
    pageHelperInitialized?: boolean;
    lastProcessedTimestamp?: {
      extractContent?: number;
      extractChatContent?: number;
      extractImages?: number;
    };
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main(ctx) {
    console.log('[Content Script] Initializing...');

    // 设置初始化标记和时间戳存储
    window.pageHelperInitialized = true;
    window.lastProcessedTimestamp = {
      extractContent: 0,
      extractChatContent: 0,
      extractImages: 0
    };
    console.log('[Content Script] Initialized and ready');

    // 添加简单的页面内容获取函数（作为备用）
    function getPageText() {
      return {
        title: document.title,
        url: window.location.href,
        text: document.body.innerText
      };
    }

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[Content Script] Received message:', request);

      const handleExtractContent = async () => {
        // 检查是否是重复消息
        if (request.timestamp && window.lastProcessedTimestamp?.extractContent === request.timestamp) {
          console.log('[Content Script] Skipping duplicate extractContent request');
          return { success: false, error: 'Duplicate request' };
        }
        window.lastProcessedTimestamp!.extractContent = request.timestamp;

        console.log('[Content Script] Processing extractContent action');
        try {
          const contentToExtractHTML = document.body.outerHTML;
          // 使用 DOMParser 解析字符串，避免直接对 innerHTML 赋值
          const parsedDoc = new DOMParser().parseFromString(contentToExtractHTML, 'text/html');
          const container = parsedDoc.body as HTMLElement;
          
          // 使用工厂获取合适的提取器
          const extractor = await MarkdownExtractorFactory.getExtractor(container);
          console.log('[Content Script] Created extractor:', extractor.getName());
          
          const markdown = await extractor.extractToMarkdown(container, request.extractorOptions);
          console.log('[Content Script] Extraction complete, markdown length:', markdown.length);
          
          // 发送消息到扩展
          try {
            console.log('[Content Script] Sending extracted content to extension...');
            chrome.runtime.sendMessage({
              type: 'contentExtracted',
              data: { markdown, autoTriggered: request.autoTriggered }
            });
            console.log('[Content Script] Message sent successfully');
          } catch (error) {
            console.error('[Content Script] Failed to send message:', error);
            // 如果发送消息失败，直接通过sendResponse返回结果
            return { success: true, markdown };
          }
          
          console.log('[Content Script] Content extraction successful');
          return { success: true, markdown };
        } catch (error) {
          console.error('[Content Script] Content extraction failed:', error);
          
          // 尝试退回到简单的文本提取
          try {
            console.log('[Content Script] Falling back to simple text extraction');
            const simpleContent = getPageText();
            return { 
              success: true, 
              markdown: `# ${simpleContent.title}\n\n${simpleContent.text}`,
              fallback: true 
            };
          } catch (fallbackError) {
            console.error('[Content Script] Even fallback extraction failed:', fallbackError);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        }
      };

      
      const handleExtractImages = async () => {
        // 检查是否是重复消息
        if (request.timestamp && window.lastProcessedTimestamp?.extractImages === request.timestamp) {
          console.log('[Content Script] Skipping duplicate extractImages request');
          return { success: false, error: 'Duplicate request' };
        }
        window.lastProcessedTimestamp!.extractImages = request.timestamp;

        console.log('[Content Script] Processing extractImages action');
        try {
          const targetElement = document.body;
          const extractor = new ImageExtractor();
          const images = await extractor.extract(targetElement);
          
          // 发送消息到扩展
          try {
            console.log('[Content Script] Sending extracted images to extension...');
            chrome.runtime.sendMessage({
              type: 'imagesExtracted',
              data: { images, autoTriggered: request.autoTriggered }
            });
            console.log('[Content Script] Image message sent successfully');
          } catch (error) {
            console.error('[Content Script] Failed to send image message:', error);
            // 如果发送消息失败，直接通过sendResponse返回结果
            return { success: true, images };
          }
          
          console.log('[Content Script] Image extraction successful, found images:', images.length);
          return { success: true, images };
        } catch (error) {
          console.error('[Content Script] Image extraction failed:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      };

      // 使用 Promise 处理异步操作
      if (request.action === 'extractContent') {
        console.log('[Content Script] Handling extractContent action');
        handleExtractContent().then(response => {
          console.log('[Content Script] Sending response for extractContent:', response);
          sendResponse(response);
        }).catch(error => {
          console.error('[Content Script] Error in extractContent:', error);
          sendResponse({ success: false, error: String(error) });
        });
        return true; // 保持消息通道开放
      }

      if (request.action === 'extractImages') {
        console.log('[Content Script] Handling extractImages action');
        handleExtractImages().then(response => {
          console.log('[Content Script] Sending response for extractImages:', response);
          sendResponse(response);
        }).catch(error => {
          console.error('[Content Script] Error in extractImages:', error);
          sendResponse({ success: false, error: String(error) });
        });
        return true; // 保持消息通道开放
      }

      console.log('[Content Script] Unhandled message action:', request.action);
      return false; // 不处理其他消息
    });

    // 发送初始化完成消息
    chrome.runtime.sendMessage({ action: 'contentScriptReady' })
      .then(() => console.log('[Content Script] Notified background of ready state'))
      .catch(err => console.error('[Content Script] Failed to notify background:', err));
  }
});
