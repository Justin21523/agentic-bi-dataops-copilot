import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import i18n from '../i18n';
import { renderWithQuery } from './test-utils';

describe('i18n', () => {
  it('defaults to zh-TW', async () => {
    localStorage.removeItem('lyrics_lab_locale');
    await i18n.changeLanguage('zh-TW');
    renderWithQuery(<LanguageSwitcher />);
    expect(screen.getByText('繁體中文')).toBeInTheDocument();
  });
});
