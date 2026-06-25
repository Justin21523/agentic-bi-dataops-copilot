import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { renderWithQuery } from './test-utils';

describe('LanguageSwitcher', () => {
  it('switches to en-US', async () => {
    renderWithQuery(<LanguageSwitcher />);
    await userEvent.selectOptions(screen.getByLabelText('語言'), 'en-US');
    expect(await screen.findByText('English')).toBeInTheDocument();
  });
});
