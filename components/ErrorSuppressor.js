'use client'

import { useEffect } from 'react'

export default function ErrorSuppressor() {
  useEffect(() => {
    // 1. Suppress Unhandled Promise Rejections for the specific Supabase lock error
    const handleUnhandledRejection = (event) => {
      try {
        const errorString = String(event.reason);
        if (errorString.includes('was released because another request stole it')) {
          event.preventDefault(); // Prevents the browser from logging the unhandled promise rejection
        }
      } catch (e) {
        // fast fail
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // 2. Patch console.error to prevent Next.js from logging the hijacked promise error
    const originalError = console.error;
    console.error = (...args) => {
      try {
        const msg = args.join(' ');
        if (typeof msg === 'string' && msg.includes('was released because another request stole it')) {
          return; // Ignore this specific Supabase warning
        }
      } catch (e) {}
      originalError.apply(console, args);
    };

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalError;
    };
  }, []);

  return null;
}
