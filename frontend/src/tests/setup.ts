import '@testing-library/jest-dom/vitest';
import '../i18n';
import i18n from '../i18n';
import { beforeEach } from 'vitest';

beforeEach(async () => {
  localStorage.setItem('lyrics_lab_locale', 'zh-TW');
  await i18n.changeLanguage('zh-TW');
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock
});
