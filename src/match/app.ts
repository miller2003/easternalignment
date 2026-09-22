/**
 * src/match/app.ts
 * Main entry point for the Eastern Alignment Situation-Based Reader Match Engine.
 */

import { initMatchApp } from './ui/quizApp';

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initMatchApp('ea-match-root'));
  } else {
    initMatchApp('ea-match-root');
  }
}

export { initMatchApp };
