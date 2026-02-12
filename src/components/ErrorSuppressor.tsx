'use client';

import { useEffect } from 'react';

export default function ErrorSuppressor() {
  useEffect(() => {
    // Suppress MetaMask errors globally
    const originalError = console.error;
    console.error = (...args) => {
      const str = args.map(a => String(a)).join(' ');
      if (str.includes('MetaMask') || str.includes('ethereum') || str.includes('inpage.js') || str.includes('connect')) {
        return;
      }
      originalError.apply(console, args);
    };

    const originalWarn = console.warn;
    console.warn = (...args) => {
      const str = args.map(a => String(a)).join(' ');
      if (str.includes('MetaMask') || str.includes('ethereum') || str.includes('inpage.js')) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Catch unhandled errors before Next.js sees them
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || '';
      const src = event.filename || '';
      if (msg.includes('MetaMask') || msg.includes('ethereum') || src.includes('inpage.js') || src.includes('chrome-extension')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason || '');
      if (reason.includes('MetaMask') || reason.includes('ethereum') || reason.includes('User rejected') || reason.includes('connect')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // Add listeners with capture phase to intercept before Next.js
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection, true);

    // Disable Next.js error overlay for MetaMask errors
    const hideNextErrorOverlay = () => {
      const overlay = document.querySelector('nextjs-portal');
      if (overlay) {
        const shadowRoot = overlay.shadowRoot;
        if (shadowRoot) {
          const dialog = shadowRoot.querySelector('[role="dialog"]');
          if (dialog) {
            const text = dialog.textContent || '';
            if (text.includes('MetaMask') || text.includes('ethereum') || text.includes('inpage.js')) {
              overlay.remove();
            }
          }
        }
      }
    };

    // Check periodically and on DOM changes
    const interval = setInterval(hideNextErrorOverlay, 100);
    const observer = new MutationObserver(hideNextErrorOverlay);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
      console.error = originalError;
      console.warn = originalWarn;
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return null;
}
