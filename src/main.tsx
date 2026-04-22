import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Polyfill for Promise.withResolvers (required by modern PDF.js in older Android WebViews)
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill for URL.parse (standardized recently, missing in some Android/iOS WebViews)
if (typeof (URL as any).parse === 'undefined') {
  (URL as any).parse = function(url: string, base?: string | URL) {
    try {
      return new URL(url, base);
    } catch (e) {
      return null;
    }
  };
}

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
