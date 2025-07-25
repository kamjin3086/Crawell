import React, { useEffect, useState } from 'react';
import GlassImageExtractor from '../../src/imageExtractor/components/GlassImageExtractor';
import MarkdownEditor from '../../src/components/Markdown/MarkdownEditor';
import { Toaster } from '@pagehelper/common/src/components/ui/toaster';
import '../../src/styles/glass.css';
import GlassPluginCard from '../../src/components/GlassPluginCard';
import GlassExtractorSettings from '../../src/components/GlassExtractorSettings';
import { X } from 'lucide-react';
import CrawellLogoMono from '../../assets/crawell-mono.svg';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [currentTool, setCurrentTool] = useState<'image' | 'markdown'>('image');

  // 跟随系统主题
  const [isDark, setIsDark] = useState(()=>document.documentElement.classList.contains('dark'));
  useEffect(()=>{
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (e:MediaQueryListEvent|MediaQueryList)=>{
      setIsDark(e.matches);
    }
    update(mq); // initial
    mq.addEventListener('change', update);
    return ()=>mq.removeEventListener('change', update as any);
  },[]);

  const handleHelp = () => {
    const url = chrome.runtime.getURL('help.html');
    chrome.tabs.create({ url });
  };

  return (
    <>
      <div className="relative w-full h-screen overflow-hidden">
        {/* 背景模糊圆 */}
        <div className="bg-blur-spot spot-1" />
        <div className="bg-blur-spot spot-2" />

        {/* 玻璃拟态卡片 */}
        <GlassPluginCard
          onHelp={handleHelp}
          onSettings={() => setShowSettings(true)}
          currentTool={currentTool}
          onSelectTool={(tool)=>setCurrentTool(tool)}
          theme={isDark? 'dark':'light'}
        >
          {/* 工具主体 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {currentTool==='image' ? <GlassImageExtractor /> : <MarkdownEditor />}
          </div>
        </GlassPluginCard>
      </div>
      <Toaster />

      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={()=>setShowSettings(false)}>
          {/* 直接渲染玻璃设置面板 */}
          <div onClick={(e)=>e.stopPropagation()} className="max-h-[80vh] overflow-y-auto">
            <GlassExtractorSettings onClose={()=>setShowSettings(false)} />
          </div>
        </div>
      )}
    </>
  );
}