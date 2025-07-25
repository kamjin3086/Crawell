import { create } from 'zustand';
import type { DownloadConfig } from '../imageExtractor/components/DownloadDialog';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// WXT runtime 注入的 storage 适配器
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const storage: any;

// Custom adapter for WXT storage
const wxtStorageAdapter: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    console.log('[WXT Adapter] getItem called for:', name);
    try {
      const storageKey = `local:${name}` as const;
      const result = await storage.getItem(storageKey);
      console.log('[WXT Adapter] getItem raw result:', result);

      if (result === null || result === undefined) {
        console.log('[WXT Adapter] No data found');
        return null;
      }

      // 如果已经是字符串，检查是否是有效的 JSON
      if (typeof result === 'string') {
        try {
          // 验证是否是有效的 JSON
          JSON.parse(result);
          console.log('[WXT Adapter] Returning valid JSON string');
          return result;
        } catch {
          // 如果不是有效的 JSON，将其转换为 JSON 字符串
          console.log('[WXT Adapter] Converting string to JSON');
          return JSON.stringify(result);
        }
      }
      
      // 如果是对象，转换为 JSON 字符串
      console.log('[WXT Adapter] Converting object to JSON string');
      return JSON.stringify(result);
    } catch (error) {
      console.error(`[WXT Adapter] Error getting item ${name}:`, error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    console.log('[WXT Adapter] setItem called for:', name, 'with value:', value);
    try {
      const storageKey = `local:${name}` as const;
      // 确保我们存储的是解析后的对象
      const parsedValue = JSON.parse(value);
      await storage.setItem(storageKey, parsedValue);
      console.log('[WXT Adapter] Successfully stored data');
    } catch (error) {
      console.error(`[WXT Adapter] Error setting item ${name}:`, error);
      throw error;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    console.log('[WXT Adapter] removeItem called for:', name);
    try {
      const storageKey = `local:${name}` as const;
      await storage.removeItem(storageKey);
      console.log('[WXT Adapter] Successfully removed data');
    } catch (error) {
      console.error(`[WXT Adapter] Error removing item ${name}:`, error);
      throw error;
    }
  },
};

export interface ExtractorOptions {
  cleanMode: boolean;
  removeAds: boolean;
  removeComments: boolean;
  removeNav: boolean;
  removeFooter: boolean;
  removeSocial: boolean;
  /** 是否过滤隐藏/极小图片 */
  filterSmallImages: boolean;
}

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

interface ExtractorState {
  options: ExtractorOptions;
  updateOptions: (options: Partial<ExtractorOptions>) => void;
  autoExtractImagesEnabled: boolean;
  toggleAutoExtractImages: () => void;
  autoExtractMarkdownEnabled: boolean;
  toggleAutoExtractMarkdown: () => void;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  resetFilters: () => void;
  filterOptions: FilterOptions;
  setFilterOptions: (options: FilterOptions) => void;
  categoryOrder: string[];
  setCategoryOrder: (order: string[]) => void;
  downloadConfig?: DownloadConfig;
  setDownloadConfig: (config: DownloadConfig) => void;
  accumulateModeEnabled: boolean;
  toggleAccumulateMode: () => void;
}

const storeName = 'extractor-settings';

export const useExtractorStore = create<ExtractorState>()(
  persist(
    (set, get) => ({
      options: {
        cleanMode: false,      // 默认不启用清爽模式
        removeAds: true,       // 默认移除广告
        removeComments: true,  // 默认移除评论
        removeNav: true,       // 默认移除导航
        removeFooter: true,    // 默认移除页脚
        removeSocial: true,    // 默认移除社交分享按钮
        filterSmallImages: true, // 默认过滤隐藏/极小图片
      },
      updateOptions: (newOptions: Partial<ExtractorOptions>) => set((state: ExtractorState) => ({
        options: {
          ...state.options,
          ...newOptions,
        },
      })),
      autoExtractImagesEnabled: false,
      toggleAutoExtractImages: () => {
        set((state: ExtractorState) => {
          console.log('[Store] Toggling autoExtractImagesEnabled from', state.autoExtractImagesEnabled, 'to', !state.autoExtractImagesEnabled);
          return { autoExtractImagesEnabled: !state.autoExtractImagesEnabled };
        });
      },
      autoExtractMarkdownEnabled: false,
      toggleAutoExtractMarkdown: () => {
        set((state: ExtractorState) => {
          console.log('[Store] Toggling autoExtractMarkdownEnabled from', state.autoExtractMarkdownEnabled, 'to', !state.autoExtractMarkdownEnabled);
          return { autoExtractMarkdownEnabled: !state.autoExtractMarkdownEnabled };
        });
      },
      filters: DEFAULT_FILTERS,
      setFilters: (filters: FilterOptions) => set({ filters }),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      filterOptions: DEFAULT_FILTERS,
      setFilterOptions: (options) => set({ filterOptions: options }),
      categoryOrder: ['ICON','THUMBNAIL','CONTENT','LARGE'],
      setCategoryOrder: (order:string[])=> set({categoryOrder:order}),
      downloadConfig: undefined,
      setDownloadConfig: (config: DownloadConfig) => set({ downloadConfig: config }),
      accumulateModeEnabled: false,
      toggleAccumulateMode: () => set((state:ExtractorState)=>({accumulateModeEnabled: !state.accumulateModeEnabled})),
    }),
    {
      name: storeName,
      storage: createJSONStorage(() => wxtStorageAdapter),
      partialize: (state) => ({
        options: state.options,
        autoExtractImagesEnabled: state.autoExtractImagesEnabled,
        autoExtractMarkdownEnabled: state.autoExtractMarkdownEnabled,
        filters: state.filters,
        filterOptions: state.filterOptions,
        categoryOrder: state.categoryOrder,
        accumulateModeEnabled: state.accumulateModeEnabled,
        downloadConfig: state.downloadConfig,
      }),
    }
  )
); 