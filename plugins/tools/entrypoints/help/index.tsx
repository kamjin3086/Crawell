import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, GitBranch, MessageSquare } from 'lucide-react';
import { FeedbackLink } from '../../src/components/FeedbackLink';
import { i18n } from '../../src/i18n';

// 预编译的 Tailwind 样式 (在实际项目中，这通常由构建工具处理)
import '../../assets/tailwind.css';

// 静态资源
// @ts-ignore
import iconPng from '../../assets/icon.png';

// --- 组件化重构 ---

// Section 组件：用于包裹每个大的功能区
const Section = ({ title, children }) => (
  <motion.section 
    className="mb-12"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <h2 className="text-2xl font-bold border-b border-gray-900/10 dark:border-white/10 pb-3 mb-6">{title}</h2>
    {children}
  </motion.section>
);

// QuickStartStep 组件：用于展示快速开始的步骤
const QuickStartStep = ({ number, title, delay }) => (
  <motion.div 
    className="p-5 bg-white/70 dark:bg-slate-800/30 rounded-xl flex items-center gap-4"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white font-bold rounded-full text-lg">
      {number}
    </div>
    <span className="font-medium text-base">{title}</span>
  </motion.div>
);

// FeatureCard 组件：用于展示核心功能
const FeatureCard = ({ title, description }) => (
  <div className="p-5 bg-white/70 dark:bg-slate-800/30 rounded-xl border border-gray-200/40 dark:border-slate-700/30">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm leading-relaxed">{description}</p>
  </div>
);

// FaqItem 组件：自定义样式的 FAQ 折叠项
const FaqItem = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details 
      className="p-0 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden"
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary
        className={
          `flex justify-between items-center cursor-pointer select-none text-base font-medium list-none px-4 py-3
          transition-colors
          hover:bg-slate-50 dark:hover:bg-slate-700/60
          ${isOpen ? 'bg-slate-100 dark:bg-slate-700/50' : 'bg-transparent dark:bg-slate-800/40'}`
        }
      >
        {q}
        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </summary>
      <AnimatePresence>
        {isOpen && (
          <motion.div className="px-4 pb-4"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <p className="text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </details>
  );
};

// ContactLink 组件：带图标的联系方式链接
const ContactLink = ({ href, icon: Icon, text }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm transition-colors hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-white/10 dark:text-slate-200"
  >
    <Icon className="w-5 h-5 text-blue-500" />
    <span className="text-sm font-medium">{text}</span>
  </a>
);

// --- 主页面组件 ---

function HelpPage() {
  const { t } = i18n;

  React.useEffect(()=>{
    document.title = t('help.pageTitle');
  }, [t]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={iconPng} alt="crawell logo" className="w-14 h-14 rounded-xl" />
            <h1 className="text-4xl font-extrabold tracking-tight">{t('help.title')}</h1>
          </div>
          <p className="text-base text-slate-500">{t('help.tagline')}</p>
        </header>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{t('help.quickStartTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { title: t('help.quick.image.title'), steps: [t('help.quick.image.s1'), t('help.quick.image.s2'), t('help.quick.image.s3'), t('help.quick.image.s4')] },
              { title: t('help.quick.markdown.title'), steps: [t('help.quick.markdown.s1'), t('help.quick.markdown.s2'), t('help.quick.markdown.s3'), t('help.quick.markdown.s4')] },
            ].map(({ title, steps }) => (
              <div key={title}>
                <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
                <ol className="space-y-2 text-sm leading-6">
                  {steps.map((s, idx) => (
                    <li key={s} className="flex items-start gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs font-bold shrink-0">{idx+1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{t('help.coreTitle')}</h2>
          <div className="space-y-4 text-sm leading-6">
            {[
              t('help.coreItems.img'),
              t('help.coreItems.markdown'),
              t('help.coreItems.autoStack')
            ].map((txt)=>(<p key={txt}>{txt}</p>))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{t('help.downloadTitle')}</h2>
          <ul className="list-disc list-inside space-y-2 text-sm leading-6">
            {
              [
                t('help.downloadItems.method'),
                t('help.downloadItems.format'),
                t('help.downloadItems.quality'),
                t('help.downloadItems.markdown'),
                t('help.downloadItems.naming')
              ].map(item=> (
                <li key={item} dangerouslySetInnerHTML={{__html:item}} />
              ))
            }
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{t('help.faqTitle')}</h2>
          <div className="space-y-3">
            <FaqItem
              q={t('help.faq.q1.q')}
              a={t('help.faq.q1.a')}
            />
            <FaqItem
              q={t('help.faq.q2.q')}
              a={t('help.faq.q2.a')}
            />
            <FaqItem
              q={t('help.faq.q3.q')}
              a={t('help.faq.q3.a')}
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-6">{t('help.feedbackTitle')}</h2>
          <p className="mb-4 text-sm">{t('help.feedbackDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <FeedbackLink variant="button" />
            <ContactLink href="https://github.com/kamjin3086/Crawell/issues" icon={GitBranch} text={t('help.contact.issue')} />
            <ContactLink href="https://discord.gg/stDBJE8tva" icon={MessageSquare} text={t('help.contact.discord')} />
          </div>
        </section>

        <footer className="text-center mt-16 pt-6 border-t border-gray-200/60 dark:border-slate-700/40 text-xs text-slate-500">
          <p>{t('help.footer.slogan')}</p>
          <p>Version {chrome?.runtime?.getManifest?.()?.version || '—'}</p>
        </footer>
      </div>
    </>
  );
}

// 渲染组件到 DOM
ReactDOM.createRoot(document.getElementById('root')!).render(<HelpPage />);