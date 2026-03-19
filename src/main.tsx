import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ★  追加：PWA更新検知
import { registerSW } from 'virtual:pwa-register'

// ★ 追加：Service Worker登録
registerSW({
  onNeedRefresh() {
    console.log('新しいバージョンがあります')
    // App側に通知
    window.dispatchEvent(new Event('sw-update'))
  },
  onOfflineReady() {
    console.log('オフライン準備完了')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
