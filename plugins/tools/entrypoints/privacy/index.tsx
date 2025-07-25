import React from 'react';
import ReactDOM from 'react-dom/client';
import { FeedbackLink } from '../../src/components/FeedbackLink';
import { i18n } from '../../src/i18n';

import '../../assets/tailwind.css';

function PrivacyPage() {
  const { t } = i18n;

  React.useEffect(()=>{
    document.title = t('privacy.pageTitle');
  }, [t]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold">{t('privacy.title')}</h1>
          <p className="text-sm mt-2 text-slate-500">{t('privacy.updated')}</p>
        </header>

        <div className="space-y-6 text-sm leading-6">
          <p>{t('privacy.intro')}</p>

          {[
            { title: t('privacy.section1.title'), text: t('privacy.section1.text') },
            { title: t('privacy.section2.title'), text: t('privacy.section2.text') },
            { title: t('privacy.section3.title'), text: t('privacy.section3.text') },
            { title: t('privacy.section4.title'), text: t('privacy.section4.text') },
            { title: t('privacy.section5.title'), text: (
              <>
                {t('privacy.section5.text.prefix')} <FeedbackLink text={t('general.feedback')} /> {t('privacy.section5.text.suffix')}
              </>
            ) },
          ].map((sec) => (
            <section key={sec.title}>
              <h2 className="text-2xl font-semibold mb-3">{sec.title}</h2>
              <p>{sec.text}</p>
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

ReactDOM.createRoot(document.getElementById('root')!).render(<PrivacyPage />); 