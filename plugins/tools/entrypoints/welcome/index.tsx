import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Puzzle, MousePointerClick, DownloadCloud } from 'lucide-react';

import '../../src/components/FeedbackLink'; // ensure bundler includes tailwind css
import '../../assets/tailwind.css';
import { i18n } from '../../src/i18n';
import { initTheme } from '../../src/utils/theme'

// @ts-ignore
import iconPng from '../../assets/icon.png';

// 在组件外定义动画 variants，避免重复创建
const listVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 + 0.1 }
  }),
};

// 立即执行一次，确保加载时已设置主题
initTheme()

function WelcomePage() {
  const [showGuide, setShowGuide] = useState(false);
  const { t } = i18n;

  React.useEffect(() => {
    document.title = t('welcome.pageTitle');
  }, [t]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-4">
      <motion.img
        src={iconPng}
        alt="Crawell logo"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12 }}
        className="w-24 h-24 rounded-xl shadow-lg"
      />
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-50"
      >
        {t('welcome.title')}
      </motion.h1>
      <p className="max-w-xl text-slate-600 dark:text-slate-400 leading-relaxed">
        {t('welcome.subtitle')}
      </p>
      <button
        onClick={async () => {
          // 尝试自动打开侧边栏（Chrome 114+），成功后关闭欢迎页
          let opened = false;
          try {
            // @ts-ignore 兼容不同浏览器，使用 bracket 访问防止 Firefox 扫描到 sidePanel.*
            const sp = (chrome as any)["sidePanel"];
            if (sp?.open) {
              await sp.open({});
              opened = true;
            }
          } catch (_) {
            /* ignore */
          }

          if (opened) {
            // 如果侧边栏已成功打开，则关闭欢迎页标签
            window.close();
          } else {
            // 否则在当前页面展示指引
            setShowGuide(true);
          }
        }}
        aria-label={t('welcome.startBtn')}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/5 hover:bg-blue-600 hover:text-white transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
      >
        {t('welcome.startBtn')}
      </button>

      <AnimatePresence>
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-left mt-4"
        >
          <h2 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-50">{t('welcome.guideTitle')}</h2>
          <ol className="space-y-3 list-decimal list-inside text-sm leading-6 text-slate-700 dark:text-slate-300">
            {[
              { icon: Globe, key: 's1' },
              { icon: Puzzle, key: 's2' },
              { icon: MousePointerClick, key: 's3' },
              { icon: DownloadCloud, key: 's4' },
            ].map(({ icon: Icon, key }, idx) => (
              <motion.li
                custom={idx}
                variants={listVariants}
                initial="hidden"
                animate="visible"
                key={key}
                className="flex items-start gap-2"
              >
                <Icon className="w-4 h-4 mt-1 text-blue-400 flex-shrink-0" />
                <span>{t(`welcome.steps.${key}`)}</span>
              </motion.li>
            ))}
          </ol>

          <button
            onClick={() => window.close()}
            className="mt-6 text-xs text-slate-500 hover:text-blue-500 underline underline-offset-4"
          >
            {t('welcome.closeBtn')}
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<WelcomePage />); 