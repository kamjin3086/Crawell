import { useState, useEffect, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { useToast } from '@pagehelper/common/src/hooks/use-toast';
import { i18n } from '../../i18n';
import { useExtractorStore } from '../../store/extractorStore';
import type { DownloadConfig } from '../components/DownloadDialog';
import {
  ImageInfo,
  formatFileSize,
  isValidImageUrl,
  normalizeImageFormat,
  calculateDisplaySize,
  getUniqueFormats,
  getUniqueSizes,
  getFileSizeRanges,
  generateFilename,
} from '../utils/imageUtils';
import { processBatchImages, type ProcessOptions } from '../utils/imageProcessor';
import { getActiveTab } from '../../utils/getActiveTab';

/* -------------------------------------------------------------------------- */
export interface FilterOptions {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  minSize: number;
  maxSize: number;
  formats: string[];
  selectedSizes: string[];
  selectedFileSizes: string[];
}

const DEFAULT_FILTERS: FilterOptions = {
  minWidth: 0,
  maxWidth: Infinity,
  minHeight: 0,
  maxHeight: Infinity,
  minSize: 0,
  maxSize: Infinity,
  formats: [],
  selectedSizes: [],
  selectedFileSizes: [],
};

/* -------------------------------------------------------------------------- */
export const useImageExtractor = () => {
  const { toast } = useToast();

  /* ------------------------------- Zustand ------------------------------- */
  const autoExtractImagesEnabled = useExtractorStore((s: any) => s.autoExtractImagesEnabled);
  const toggleAutoExtractImages = useExtractorStore((s: any) => s.toggleAutoExtractImages);
  const accumulateModeEnabled = useExtractorStore((s: any) => s.accumulateModeEnabled);
  const storeFilterOptions = useExtractorStore((s: any) => s.filterOptions);
  const setStoreFilterOptions = useExtractorStore((s: any) => s.setFilterOptions);
  const toggleAccumulateMode = useExtractorStore((s: any) => s.toggleAccumulateMode);

  /* ------------------------------- State -------------------------------- */
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageInfo[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  // 提取超时保护
  const extractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------------- */
  // helper to process an image src into ImageInfo
  const processImage = async (imgSrc: string): Promise<ImageInfo | null> => {
    if (!isValidImageUrl(imgSrc)) return null;
    return new Promise((resolve) => {
      const img = new Image();
      const t = setTimeout(() => resolve(null), 10000);
      img.onload = () => {
        clearTimeout(t);
        const { width, height } = calculateDisplaySize(img.naturalWidth, img.naturalHeight);
        fetch(imgSrc, { method: 'HEAD' })
          .then((res) => {
            const size = parseInt(res.headers.get('content-length') || '0');
            let format = 'unknown';
            const ct = res.headers.get('content-type');
            if (ct) {
              const m = ct.match(/image\/(\w+)/);
              if (m) format = m[1].toLowerCase();
            }
            if (format === 'unknown') {
              const urlM = imgSrc.match(/\.(\w+)(?:\?|$)/);
              if (urlM) format = urlM[1].toLowerCase();
            }
            format = normalizeImageFormat(format);
            resolve({
              src: imgSrc,
              alt: '',
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              displayWidth: width,
              displayHeight: height,
              format,
              size,
            });
          })
          .catch(() => resolve(null));
      };
      img.onerror = () => {
        clearTimeout(t);
        resolve(null);
      };
      img.src = imgSrc;
    });
  };

  // 生成去重键：文件名(去掉参数)+大小
  const imageKey = (img: ImageInfo) => {
    const name = img.src.split('/').pop()?.split('?')[0] || img.src;
    return `${name}-${img.size}`;
  };

  /* -------------------------------- 提取 ------------------------------- */
  const extract = async () => {
    try {
      // 清理上一次可能残留的定时器
      if (extractionTimeoutRef.current) {
        clearTimeout(extractionTimeoutRef.current);
      }
      setError(null);
      setIsExtracting(true);
      // 如果 30 秒仍未完成，自动关闭加载状态，防止 UI 卡死
      extractionTimeoutRef.current = setTimeout(() => {
        setIsExtracting(false);
      }, 30000);
      if (!accumulateModeEnabled) {
        setImages([]);
        setSelectedImages(new Set());
      }

      const currentTab = await getActiveTab();
      if (!currentTab?.id || !currentTab.url) {
        setError(i18n.t('imageExtractor.error.noTab'));
        setIsExtracting(false);
        return;
      }
      const invalidPrefixes = ['chrome://', 'edge://', 'about:', 'data:', 'chrome-extension://', 'devtools://', 'view-source:'];
      if (invalidPrefixes.some((pre) => currentTab.url!.startsWith(pre))) {
        const errMsg = i18n.t('imageExtractor.error.internalPage');
        setError(errMsg);
        toast({ title: i18n.t('imageExtractor.error.title'), description: errMsg, variant: 'destructive' });
        setTimeout(() => {
          setError(null);
        }, 5000);
        setIsExtracting(false);
        return;
      }

      chrome.tabs.sendMessage(currentTab.id, { action: 'extractImages' }, async (resp) => {
        if (chrome.runtime.lastError) {
          const raw = chrome.runtime.lastError.message || '';
          // 页面尚未注入 content script，通常是因为正在加载
          if (/Receiving end does not exist|Could not establish connection/i.test(raw)) {
            // 非致命错误：页面加载中
            toast({ 
              title: i18n.t('imageExtractor.info.pageLoading'),
              description: i18n.t('imageExtractor.info.waitPageLoad'),
              variant: 'default' 
            });
            setIsExtracting(false);
            return;
          }

          // 其它情况按原逻辑处理
          const msg = i18n.t('imageExtractor.error.cannotExecute');
          setError(msg);
          toast({ title: i18n.t('imageExtractor.error.title'), description: msg, variant: 'destructive' });
          setTimeout(() => setError(null), 5000);
          setIsExtracting(false);
          return;
        }
        if (!resp?.success) {
          const msg = resp?.error || i18n.t('imageExtractor.error.generic');
          setError(msg);
          toast({ title: i18n.t('imageExtractor.error.title'), description: msg, variant: 'destructive' });
          setTimeout(() => setError(null), 5000);
          setIsExtracting(false);
          return;
        }

        const list: string[] = resp.images || [];
        const infos: ImageInfo[] = (await Promise.all(list.map(processImage))).filter((i): i is ImageInfo => i !== null) as ImageInfo[];
        setImages((prev)=>{
          if (!accumulateModeEnabled) return infos;
          const map = new Map<string, ImageInfo>();
          prev.forEach((i)=>map.set(imageKey(i), i));
          infos.forEach((i)=>map.set(imageKey(i),i));
          return Array.from(map.values());
        });
        setFilteredImages((prev)=>{
          if (!accumulateModeEnabled) return infos;
          const map = new Map<string, ImageInfo>();
          prev.forEach((i)=>map.set(imageKey(i), i));
          infos.forEach((i)=>map.set(imageKey(i),i));
          return Array.from(map.values());
        });
        setSelectedImages((prev)=>{
          const set = accumulateModeEnabled ? new Set(prev) : new Set<string>();
          infos.forEach((i)=>set.add(imageKey(i)));
          return set;
        });
        toast({ 
          title: i18n.t('imageExtractor.extract.success'), 
          description: i18n.t('imageExtractor.extract.successDescription', infos.length) 
        });
        setIsExtracting(false);
      });
    } catch (e) {
      setError(i18n.t('imageExtractor.error.unknown'));
      setIsExtracting(false);
    }
  };

  /* ------------------------------ 过滤逻辑 ------------------------------ */
  const applyFilters = (imgs: ImageInfo[], filters: FilterOptions) => {
    /* ---------- helpers ---------- */
    const parseFixed = (str: string) => {
      const m = str.match(/^(\d+)x(\d+)$/i);
      return m ? { w: parseInt(m[1], 10), h: parseInt(m[2], 10) } : null;
    };

    const matchesSize = (img: ImageInfo): boolean => {
      if (filters.selectedSizes.length === 0) return true;
      return filters.selectedSizes.some((sizeKey) => {
        // 区间样式  WxH-WxH 或 * 作通配
        if (sizeKey.includes('-')) {
          const [minStr, maxStr] = sizeKey.split('-');
          const [minW, minH] = minStr.split('x').map((v) => (v === '*' ? 0 : parseInt(v)));
          const [maxW, maxH] = maxStr.split('x').map((v) => (v === '*' ? Infinity : parseInt(v)));
          return (
            img.naturalWidth >= minW &&
            img.naturalWidth <= maxW &&
            img.naturalHeight >= minH &&
            img.naturalHeight <= maxH
          );
        }
        // 固定尺寸
        const fixed = parseFixed(sizeKey);
        if (fixed) {
          return img.naturalWidth === fixed.w && img.naturalHeight === fixed.h;
        }
        return false;
      });
    };

    const toBytes = (num: number, unit: 'KB' | 'MB') => num * 1024 * (unit === 'MB' ? 1024 : 1);

    const matchesFileSize = (img: ImageInfo): boolean => {
      if (filters.selectedFileSizes.length === 0) return true;
      return filters.selectedFileSizes.some((label) => {
        let min = 0;
        let max = Infinity;
        const mLe = label.match(/^≤(\d+(?:\.\d+)?)(KB|MB)$/i);
        if (mLe) {
          max = toBytes(parseFloat(mLe[1]), mLe[2].toUpperCase() as 'KB' | 'MB');
        } else {
          const mGe = label.match(/^≥(\d+(?:\.\d+)?)(KB|MB)$/i);
          if (mGe) {
            min = toBytes(parseFloat(mGe[1]), mGe[2].toUpperCase() as 'KB' | 'MB');
          } else {
            const mRange = label.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(KB|MB)$/i);
            if (mRange) {
              min = toBytes(parseFloat(mRange[1]), mRange[3].toUpperCase() as 'KB' | 'MB');
              max = toBytes(parseFloat(mRange[2]), mRange[3].toUpperCase() as 'KB' | 'MB');
            }
          }
        }
        return img.size >= min && img.size <= max;
      });
    };

    return imgs.filter((img) => {
      const formatOk = filters.formats.length === 0 || filters.formats.includes(img.format);
      return formatOk && matchesSize(img) && matchesFileSize(img);
    });
  };

  useEffect(() => {
    if (images.length === 0) return;
    const fi = applyFilters(images, storeFilterOptions);
    setFilteredImages(fi);
    // 如果当前选中集合与过滤结果长度不一致，自动同步（保证自动全选视觉生效）
    setSelectedImages((prev)=>{
      if(prev.size===fi.length) return prev;
      return new Set(fi.map((i)=>imageKey(i)));
    });
  }, [images, storeFilterOptions]);

  /* ------------------------------ 选择逻辑 ------------------------------ */
  const toggleSelect = (src: string) => {
    setSelectedImages((prev) => {
      const n = new Set(prev);
      n.has(src) ? n.delete(src) : n.add(src);
      return n;
    });
  };
  const selectAll = () => setSelectedImages(new Set(filteredImages.map((i) => imageKey(i))));
  const unselectAll = () => setSelectedImages(new Set());
  const invertSelect = () => {
    setSelectedImages((prev) => {
      const n = new Set<string>();
      filteredImages.forEach((img) => (!prev.has(imageKey(img)) ? n.add(imageKey(img)) : null));
      return n;
    });
  };

  /* -------------------------------- 下载 ------------------------------- */
  const download = async (config: DownloadConfig) => {
    if (selectedImages.size === 0) return;
    
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: selectedImages.size });
    
    try {
      const selectedImagesArray = Array.from(selectedImages);
      
      // 准备待处理的图片列表
      const imagesToProcess = selectedImagesArray.map((key, index) => {
        const img = images.find((i) => imageKey(i) === key);
        if (!img) return null;
        
        const filename = generateFilename(
          config.rename?.enabled ? config.rename.pattern : 'image-{index}',
          (config.rename?.startIndex || 1) + index,
          img.src.split('/').pop()?.split('?')[0] || 'img'
        );
        
        return {
          url: img.src,
          format: img.format,
          filename
        };
      }).filter(Boolean) as Array<{ url: string; format: string; filename: string }>;

      // 准备处理选项
      const processOptions: ProcessOptions = {
        format: config.format,
        compress: config.compress,
        resize: config.resize
      };

      // 批量处理图片
      const processedImages = await processBatchImages(
        imagesToProcess,
        processOptions,
        (current, total) => {
          setDownloadProgress({ current, total });
        }
      );

      if (config.downloadType === 'zip') {
        // 打包下载
        const zip = new JSZip();
        
        processedImages.forEach((result) => {
          const finalFilename = `${result.filename}.${result.format}`;
          zip.file(finalFilename, result.blob);
        });
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.package.filename || 'images'}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        // 单个文件下载
        processedImages.forEach((result) => {
          const url = URL.createObjectURL(result.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${result.filename}.${result.format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
      }
      
      toast({ 
        title: i18n.t('imageExtractor.download.success'), 
        description: i18n.t('imageExtractor.download.successDescription', processedImages.length ) 
      });
    } catch (err) {
      console.error(i18n.t('imageExtractor.download.error'), err);
      toast({ 
        title: i18n.t('imageExtractor.download.error'), 
        description: err instanceof Error ? err.message : i18n.t('imageExtractor.download.errorDescription'),
        variant: 'destructive' 
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  /* ------------------------------ 统计数据 ------------------------------ */
  const formats = useMemo(() => getUniqueFormats(images), [images]);
  const formatCounts = useMemo(() => {
    const obj: Record<string, number> = {};
    images.forEach((i) => {
      obj[i.format] = (obj[i.format] || 0) + 1;
    });
    return obj;
  }, [images]);
  const sizeCounts = useMemo(() => getUniqueSizes(images), [images]);
  const fileSizeCounts = useMemo(() => getFileSizeRanges(images), [images]);

  /* ------------------------------ 监听自动提取消息 ------------------------------ */
  useEffect(() => {
    const handleRuntimeMsg = (msg: any) => {
      if (msg.type === 'imagesExtracted' && msg.data) {
        const { images: list, autoTriggered } = msg.data;
        if (!autoTriggered) return;
        if (!Array.isArray(list) || list.length === 0) return;
        // 处理提取结果，按堆积模式合并
        const process = async () => {
          const infos: ImageInfo[] = (await Promise.all(list.map(processImage))).filter(
            (i): i is ImageInfo => i !== null,
          );
          setImages((prev)=>{
            if (!accumulateModeEnabled) return infos;
            const map=new Map<string,ImageInfo>();
            prev.forEach((i)=>map.set(imageKey(i), i));
            infos.forEach((i)=>map.set(imageKey(i),i));
            return Array.from(map.values());
          });
          setFilteredImages((prev)=>{
            if (!accumulateModeEnabled) return applyFilters(infos, storeFilterOptions);
            const combined=[...prev,...infos];
            const uniqueMap=new Map<string,ImageInfo>();
            combined.forEach(i=>uniqueMap.set(imageKey(i),i));
            return applyFilters(Array.from(uniqueMap.values()), storeFilterOptions);
          });
          if(accumulateModeEnabled){
            setSelectedImages((prev)=>{
              const set=new Set(prev);
              infos.forEach(i=>set.add(imageKey(i)));
              return set;
            });
          }
          // 提取完成，关闭加载指示
          setIsExtracting(false);
        };
        process().catch(console.error);
      }
    };
    chrome.runtime.onMessage.addListener(handleRuntimeMsg);
    return () => chrome.runtime.onMessage.removeListener(handleRuntimeMsg);
  }, [storeFilterOptions, accumulateModeEnabled]);

  /* ---------------------- 监听标签页切换 / URL 变化 ---------------------- */
  useEffect(() => {
    if (!autoExtractImagesEnabled) return;

    let timeoutId: any = null;

    const setLoadingWithTimeout = () => {
      setIsExtracting(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsExtracting(false), 20000);
    };

    const handleUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'loading') {
        getActiveTab().then((tab) => {
          if (tab?.id === tabId) setLoadingWithTimeout();
        });
      } else if (changeInfo.status === 'complete') {
        getActiveTab().then((tab) => {
          if (tab?.id === tabId) {
            // 页面加载完毕后，如果没有 imagesExtracted 消息 20s timeout 后会自动关闭
          }
        });
      }
    };

    const handleActivated = () => setLoadingWithTimeout();

    chrome.tabs.onUpdated.addListener(handleUpdated);
    chrome.tabs.onActivated.addListener(handleActivated);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      chrome.tabs.onActivated.removeListener(handleActivated);
    };
  }, [autoExtractImagesEnabled]);

  /* -------------------------------- API -------------------------------- */
  return {
    images,
    filteredImages,
    selected: selectedImages,
    isExtracting,
    isDownloading,
    downloadProgress,
    error,
    formats,
    formatCounts,
    sizeCounts,
    fileSizeCounts,
    extract,
    download,
    toggleSelect,
    selectAll,
    unselectAll,
    invertSelect,
    autoExtractImagesEnabled,
    toggleAutoExtractImages,
    accumulateModeEnabled,
    toggleAccumulateMode,
    filterOptions: storeFilterOptions,
    updateFilters: setStoreFilterOptions,
  } as const;
}; 

export type UseImageExtractorReturn = ReturnType<typeof useImageExtractor>;