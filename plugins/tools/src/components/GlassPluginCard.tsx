import React from 'react';
import { HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import { i18n } from '../i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@pagehelper/common/src/components/ui/dropdown-menu';

interface GlassPluginCardProps {
  children: React.ReactNode;
  onHelp?: () => void;
  onSettings?: () => void;
  currentTool?: 'image' | 'markdown';
  onSelectTool?: (tool: 'image' | 'markdown') => void;
  theme?: 'light' | 'dark'; // 主题切换
}

/**
 * GlassPluginCard 复刻自 crawell_design.html，封装为 React 组件。
 * 仅负责展示外观，内部 children 用于渲染主体内容（如 toolbar + main content）。
 */
const GlassPluginCard: React.FC<GlassPluginCardProps> = ({
  children,
  onHelp,
  onSettings,
  currentTool = 'image',
  onSelectTool,
  theme = 'light',
}) => {
  const themeClass = theme === 'light' ? 'theme-glassmorphism-light' : 'theme-glassmorphism-dark';

  const tools = [
    { key: 'image', label: i18n.t('glassPluginCard.tools.image') },
    { key: 'markdown', label: i18n.t('glassPluginCard.tools.markdown') },
  ] as const;

  const activeTool = tools.find(t=>t.key===currentTool) || tools[0];

  return (
    <div className={`theme-glassmorphism ${themeClass} plugin-card w-full h-full flex flex-col overflow-hidden`}>
      {/* Header */}
      <header className="header p-3 flex justify-between items-center flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none">
              <span className="font-semibold text-sm">{activeTool.label}</span>
              <svg
                className="w-4 h-4 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 glass-dialog bg-slate-50/95 dark:bg-slate-800/85 backdrop-blur-md border border-[var(--border-glass)] p-1 rounded-lg">
            {tools.map(t=> (
              <DropdownMenuItem key={t.key} onSelect={()=>{
                onSelectTool?.(t.key);
              }} className={"text-sm cursor-pointer "+(t.key===currentTool? 'font-semibold':'')}>{t.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <button
            className="btn-icon rounded-full p-2"
            title={i18n.t('glassPluginCard.help')}
            onClick={onHelp}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          {onSettings && (
            <button
              className="btn-icon rounded-full p-2"
              title={i18n.t('glassPluginCard.settings')}
              onClick={onSettings}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        {children}
      </div>
    </div>
  );
};

export default GlassPluginCard; 