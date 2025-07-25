import React from 'react';
import { FeedbackLink } from '../../src/components/FeedbackLink';
import ReactDOM from 'react-dom/client';
import '../../assets/tailwind.css';
import { i18n } from '../../src/i18n';

function TermsPage() {
  const { t } = i18n;

  React.useEffect(()=>{
    document.title = t('terms.pageTitle');
  }, [t]);

  const sections = [
    { title: t('terms.section1.title'), text: t('terms.section1.text') },
    { title: t('terms.section2.title'), text: t('terms.section2.text') },
    { title: t('terms.section3.title'), text: t('terms.section3.text') },
    { title: t('terms.section4.title'), text: t('terms.section4.text') },
    { title: t('terms.section5.title'), text: t('terms.section5.text') },
    { title: t('terms.section6.title'), text: (
        <>
          {t('terms.section6.text.prefix')} <FeedbackLink text={t('general.feedback')} /> {t('terms.section6.text.suffix')}
        </>
      ) },
  ];

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold">{t('terms.title')}</h1>
          <p className="text-sm mt-2 text-slate-500">{t('terms.updated')}</p>
        </header>

        <div className="space-y-6 text-sm leading-6">
          <p>{t('terms.intro')}</p>

          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-2xl font-semibold mb-3">{s.title}</h2>
              <p>{s.text}</p>
            </section>
          ))}
        </div>

        <footer className="text-center mt-16 pt-6 border-t border-gray-200/60 dark:border-slate-700/40 text-xs text-slate-500">
          <p>&copy; 2025 Crawell. All Rights Reserved.</p>
        </footer>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<TermsPage />); 