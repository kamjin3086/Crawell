import React, { useState, useEffect, useRef, useCallback, useTransition, useDeferredValue } from 'react';
import { Button } from '@pagehelper/common/src/components/ui/button';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
// 可选：如需代码高亮，可单独按需引入语言包；此处省略以减少 bundle。
import { EditorView } from '@codemirror/view';
import { RefreshCcw, Sparkles, Copy, Check, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@pagehelper/common/src/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@pagehelper/common/src/components/ui/tooltip';
import { useExtractorStore } from '../../store/extractorStore';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import CrawellMonoLogo from '../../../assets/crawell-mono.svg';
import { i18n } from '../../i18n';
import { getActiveTab } from '../../utils/getActiveTab';

// 从独立文件导入图片预览组件及其类型
import ImagePreview, { CachedImage } from './ImagePreview';
import { useImageCache } from '../../hooks/useImageCache';
import { useMarkdownStats } from '../../hooks/useMarkdownStats';
import type { Stats } from '../../hooks/useMarkdownStats';
import { EditorFooter } from './EditorFooter';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * CodeMirror 自定义主题，保持与预览区域一致的字体与行高。
 */
const editorTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    lineHeight: '1.6',
  },
  '.cm-content': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    padding: '1rem',
  },
  '.cm-line': { padding: '0 4px' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-selectionBackground': { backgroundColor: '#b3d4fc50' },
  '.cm-focused': { outline: 'none' },
  // Markdown syntax highlighting
  '.cm-header': { color: '#0550b3' },
  '.cm-strong': { color: '#1a1a1a', fontWeight: 'bold' },
  '.cm-em': { color: '#1a1a1a', fontStyle: 'italic' },
  '.cm-link': { color: '#0969da' },
  '.cm-url': { color: '#0969da' },
  '.cm-quote': { color: '#24292f', fontStyle: 'italic' },
  '.cm-code': {
    color: '#24292f',
    backgroundColor: '#f6f8fa',
    borderRadius: '3px',
    padding: '0.2em 0.4em',
  },
});

// ReactMarkdown 已封装在 MarkdownRenderer 中

const MarkdownEditor: React.FC = () => {
  // 原始 Markdown 文本
  const [output, setOutput] = useState('');
  // React 18 并发特性：延迟大文本渲染，避免阻塞点击
  const deferredOutput = useDeferredValue(output);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [modifiedOutput, setModifiedOutput] = useState('');
  
  // 添加搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use Zustand store for autoExtractMarkdownEnabled
  const autoExtractMarkdownEnabled = useExtractorStore((state) => state.autoExtractMarkdownEnabled);
  const toggleAutoExtractMarkdown = useExtractorStore((state) => state.toggleAutoExtractMarkdown);

  // 提取器选项（cleanMode 等）
  const extractorOptions = useExtractorStore((state) => state.options);
  const updateExtractorOptions = useExtractorStore((state) => state.updateOptions);

  // Use image cache hook
  const { cachedImages, cacheImage, extractImageUrls, clearCache } = useImageCache();
  // 实时统计字数 / 图片数量
  const stats: Stats = useMarkdownStats(output, extractImageUrls);

  const { t } = i18n;

  // 修改滚动到指定的搜索结果的函数
  const scrollToResult = (index: number) => {
    if (searchResults.length === 0) return;

    if (showSource) {
      // 编辑器模式下的定位
      const editor = editorRef.current?.view;
      if (!editor) return;

      const position = searchResults[index];
      const searchTerm = searchQuery.toLowerCase();
      
      // 设置光标位置并滚动到视图中
      editor.dispatch({
        changes: [],
        selection: {
          anchor: position,
          head: position + searchTerm.length
        }
      });
      
      // 确保选中的文本在视图中可见
      editor.requestMeasure({
        read: () => {
          const coords = editor.coordsAtPos(position);
          if (coords) {
            const scrollTop = coords.top - (editor.dom.clientHeight / 2);
            return { scrollTop };
          }
          return null;
        },
        write: (measure) => {
          if (measure) {
            editor.scrollDOM.scrollTop = Math.max(0, measure.scrollTop);
          }
        }
      });
    } else {
      // 预览模式下的定位（改进：使用元素相对容器的位移计算，确保滚动准确）
      if (!contentRef.current) return;

      // 查询所有高亮元素（由 MarkdownRenderer 添加的 span）
      const highlightEls = getHighlightElements();

      if (highlightEls.length === 0) return;

      // 若索引超出范围，进行安全处理
      const safeIndex = Math.min(index, highlightEls.length - 1);
      const targetElement = highlightEls[safeIndex];

      // 直接使用 scrollIntoView，定位更准确且跨浏览器一致
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // 添加临时聚焦样式
      targetElement.classList.add('search-highlight-focus');
      setTimeout(() => {
        targetElement.classList.remove('search-highlight-focus');
      }, 1000);
    }
  };

  // 处理搜索框展开
  const handleSearchExpand = () => {
    setIsSearchExpanded(true);
    // 等待DOM更新后聚焦输入框
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // 处理搜索框折叠
  const handleSearchCollapse = () => {
    setIsSearchExpanded(false);
    // 清除搜索状态
    setSearchQuery('');
    setSearchResults([]);
    setCurrentResultIndex(-1);
  };

  // 处理搜索框按键
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSearchCollapse();
    }
  };

  // 处理搜索框失焦
  const handleSearchBlur = () => {
    // 只在搜索框为空时自动收起
    if (searchQuery.trim() === '') {
      handleSearchCollapse();
    }
  };

  // 修改工具栏中的搜索按钮点击处理
  const handleSearchToggle = () => {
    if (isSearchExpanded) {
      handleSearchCollapse();
    } else {
      handleSearchExpand();
    }
  };

  // 监听自动提取事件
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('[MarkdownEditor] Received chrome runtime message:', message);
      if (message.type === 'contentExtracted' && message.data) {
        const { markdown, autoTriggered } = message.data;
        
        // 只有在自动提取模式下或没有现有内容时才更新
        if (autoTriggered || !output) {
          console.log('[MarkdownEditor] Updating content');
          // 使用并发更新，先结束点击事件，再异步渲染大文本
          startTransition(() => setOutput(markdown));
          setIsExtracting(false); // 自动提取完成，关闭指示
          
          // 提取并缓存图片
          const imageUrls = extractImageUrls(markdown);
          imageUrls.forEach(url => {
            if (!cachedImages.has(url)) {
              cacheImage(url).catch(console.error);
            }
          });
        }
      }
    };

    // 监听来自 content script 的消息
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [cachedImages, output, cacheImage, extractImageUrls]);

  // Listen to tab changes to show auto-extract loading
  useEffect(() => {
    const startLoading = () => {
      if (!autoExtractMarkdownEnabled) return; // 双重保护
      setIsExtracting(true)
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = setTimeout(() => setIsExtracting(false), 20000)
    }

    const handleUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (!autoExtractMarkdownEnabled) return
      if (changeInfo.status === 'loading') {
        getActiveTab().then((tab) => {
          if (tab?.id === tabId) startLoading()
        })
      }
    }

    const handleActivated = () => {
      if (autoExtractMarkdownEnabled) startLoading()
    }

    // 根据当前开关注册/注销监听器
    if (autoExtractMarkdownEnabled) {
      chrome.tabs.onUpdated.addListener(handleUpdated)
      chrome.tabs.onActivated.addListener(handleActivated)
    }

    return () => {
      // 始终清理监听器 & 计时器
      chrome.tabs.onUpdated.removeListener(handleUpdated)
      chrome.tabs.onActivated.removeListener(handleActivated)
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [autoExtractMarkdownEnabled])

  // 添加下载 ZIP 功能
  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      let updatedContent = output;
      
      // 添加 Markdown 文件
      zip.file('content.md', updatedContent);
      
      // 添加图片
      const imageUrls = extractImageUrls(updatedContent);
      const imagePromises = imageUrls.map(async (url) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const filename = url.split('/').pop() || `image-${Date.now()}.${blob.type.split('/')[1]}`;
          zip.file(`images/${filename}`, blob);
          
          // 更新 Markdown 中的图片链接为相对路径
          const relativeUrl = `images/${filename}`;
          updatedContent = updatedContent.replace(url, relativeUrl);
        } catch (error) {
          console.error(`Failed to download image: ${url}`, error);
        }
      });
      
      await Promise.all(imagePromises);
      
      // 更新后的 Markdown 内容
      zip.file('content.md', updatedContent);
      setModifiedOutput(updatedContent);
      
      // 生成并下载 ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `extracted-content-${new Date().toISOString().split('T')[0]}.zip`);
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      setError(t('markdownEditor.errZip'));
      setTimeout(() => setError(null), 5000);
    }
  };

  /* ---------------- 图片提取 / 缓存 / 复制 / 下载 ---------------- */

  /** 从页面提取 Markdown （与 content-script 通信）*/
  const handleExtract = async () => {
    try {
      setError(null)
      setIsExtracting(true)

      const currentTab = await getActiveTab();
      if (!currentTab?.id || !currentTab.url) {
        setError(t('markdownEditor.errNoTab'))
        setTimeout(()=>setError(null),5000)
        return
      }

      // Skip chrome 内置页面
      const invalidPrefixes = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'devtools://', 'view-source:']
      if (invalidPrefixes.some((pre) => currentTab.url!.startsWith(pre))) {
        setError(t('markdownEditor.errInternalPage'))
        setTimeout(()=>setError(null),5000)
        setIsExtracting(false)
        return
      }

      const currentOptions = useExtractorStore.getState().options;
      chrome.tabs.sendMessage(currentTab.id, { action: 'extractContent', extractorOptions: currentOptions }, async (response) => {
        if (chrome.runtime.lastError) {
          setError(t('markdownEditor.errNoConnect'))
          setTimeout(()=>setError(null),5000)
          setIsExtracting(false)
          return
        }

        if (response?.success) {
          // 使用并发更新，先结束点击事件，再异步渲染大文本
          startTransition(() => setOutput(response.markdown))
          const imgUrls = extractImageUrls(response.markdown)
          await Promise.all(imgUrls.map(cacheImage))
        } else {
          setError(response?.error || t('markdownEditor.errExtract'))
          setTimeout(()=>setError(null),5000)
        }
        setIsExtracting(false)
      })
    } catch (e: any) {
      setError(t('markdownEditor.errOperation', {msg: e?.message || t('markdownEditor.unknown')}))
      setTimeout(()=>setError(null),5000)
      setIsExtracting(false)
    }
  }

  /** 复制 Markdown 文本*/
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setShowCopySuccess(true)
      setTimeout(() => setShowCopySuccess(false), 2000)
    } catch {
      setError(t('markdownEditor.errCopy'))
    }
  }

  /** 编辑器内容变更 */
  const handleOutputChange = (val: string) => {
    setOutput(val)
    extractImageUrls(val).forEach(cacheImage)
  }

  /* ---------------- 搜索逻辑 ---------------- */

  const getHighlightElements = (): HTMLElement[] => {
    if (!contentRef.current) return []
    return Array.from(
      contentRef.current.querySelectorAll<HTMLElement>('span.bg-yellow-200')
    )
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)

    if (!query.trim()) {
      setSearchResults([])
      setCurrentResultIndex(-1)
      return
    }

    if (showSource) {
      // 编辑器模式：通过文本位置索引
      const results: number[] = []
      const lower = output.toLowerCase()
      const term = query.toLowerCase()
      let idx = 0
      while ((idx = lower.indexOf(term, idx)) !== -1) {
        results.push(idx)
        idx += term.length
      }
      setSearchResults(results)
      setCurrentResultIndex(results.length ? 0 : -1)
      if (results.length) scrollToResult(0)
    } else {
      // 预览模式：等待 DOM 更新后统计高亮元素
      setTimeout(() => {
        const els = getHighlightElements()
        const indices = els.map((_, i) => i)
        setSearchResults(indices)
        setCurrentResultIndex(indices.length ? 0 : -1)
        if (indices.length) scrollToResult(0)
      }, 30) // 让 React 完成渲染
    }
  }

  const handleNextResult = () => {
    if (!searchResults.length) return
    const next = (currentResultIndex + 1) % searchResults.length
    setCurrentResultIndex(next)
    scrollToResult(next)
  }

  const handlePrevResult = () => {
    if (!searchResults.length) return
    const prev = (currentResultIndex - 1 + searchResults.length) % searchResults.length
    setCurrentResultIndex(prev)
    scrollToResult(prev)
  }

  return (
    <div className="flex flex-col h-full relative">
      <style>
        {`
          .search-highlight-focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
            border-radius: 4px;
          }
        `}
      </style>
      
      {/* 工具栏（Glass 风格） */}
      <div className="toolbar flex items-center gap-2 btn-icon-group pb-4 border-b border-[var(--border-glass)] select-none">
        {/* 提取 / 重新提取按钮 */}
        <button
          className="btn-primary w-32 text-sm py-2 px-4 shadow-sm flex items-center justify-center gap-2 focus:outline-none"
          onClick={handleExtract}
          disabled={isExtracting || isPending}
        >
          <RefreshCcw className={cn('w-4 h-4', isExtracting && 'animate-spin')} strokeWidth={2.5} />
          {isExtracting ? t('markdownEditor.extracting') : output ? t('markdownEditor.reExtract') : t('markdownEditor.extract')}
        </button>

        {/* 自动提取 */}
        <button
          className={cn('btn-icon p-2 relative', autoExtractMarkdownEnabled && 'active', isExtracting && autoExtractMarkdownEnabled && 'auto-loading')}
          title={t('markdownEditor.autoExtract')}
          onClick={toggleAutoExtractMarkdown}
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* 搜索 */}
        {output && (
          <button
            className={cn('btn-icon p-2', isSearchExpanded && 'active')}
            title={t('markdownEditor.search')}
            onClick={handleSearchToggle}
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* 复制 */}
        {output && (
          <button
            className="btn-icon p-2"
            title={t('markdownEditor.copy')}
            onClick={handleCopy}
          >
            {showCopySuccess ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        )}

        {/* 清爽模式切换 */}
        <button
          className={cn('btn-icon p-2', extractorOptions.cleanMode && 'active')}
          title={extractorOptions.cleanMode ? t('markdownEditor.cleanModeOn') : t('markdownEditor.cleanModeOff')}
          onClick={() => updateExtractorOptions({ cleanMode: !extractorOptions.cleanMode })}
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* 使用说明块已移除，空态交由下方主内容区域处理 */}

      {/* 搜索栏 */}
      {output && (
        <motion.div
          initial={false}
          animate={{ maxHeight: isSearchExpanded ? 120 : 0 }}
          className="overflow-hidden border-b transition-[max-height] duration-300 ease-in-out"
        >
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/70 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onBlur={handleSearchBlur}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('markdownEditor.searchPlaceholder')}
                  className="w-full pl-8 pr-4 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent bg-white dark:bg-slate-800/40 dark:text-slate-200 dark:placeholder:text-slate-500 dark:border-slate-600"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>{currentResultIndex + 1}/{searchResults.length}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={handlePrevResult}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                    >
                      ↑
                    </Button>
                    <Button
                      onClick={handleNextResult}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 flex-shrink-0"
          >
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-auto">
        {output ? (
          <div className="h-full">
            {showSource ? (
              <CodeMirror
                ref={editorRef}
                value={output}
                height="100%"
                extensions={[markdown({ base: markdownLanguage })]}
                theme={editorTheme}
                onChange={handleOutputChange}
                className="h-full"
              />
            ) : (
              <div 
                ref={contentRef}
                className="prose prose-sm max-w-none p-4 h-full overflow-auto"
              >
                <MarkdownRenderer
                  markdown={deferredOutput}
                  searchQuery={searchQuery}
                  cachedImages={cachedImages}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="placeholder-box w-full">
              <img src={CrawellMonoLogo} alt="placeholder" className="w-20 h-20 mx-auto" />
              <p className="title">{t('markdownEditor.emptyTitle')}</p>
              <p className="subtitle">{t('markdownEditor.emptySubtitle')}</p>
            </div>
          </div>
        )}
      </div>

      <EditorFooter
        output={output}
        showSource={showSource}
        toggleShowSource={() => setShowSource(!showSource)}
        stats={stats}
        onDownloadZip={handleDownloadZip}
      />
    </div>
  );
};

export default MarkdownEditor; 