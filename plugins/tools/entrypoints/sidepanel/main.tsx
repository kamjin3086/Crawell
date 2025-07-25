import '../../src/utils/silenceConsole';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import { initTheme } from '../../src/utils/theme'

// 初始化主题（亮/暗）
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
