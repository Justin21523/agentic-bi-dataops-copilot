import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorState } from '../components/common/ErrorState';
import { renderWithQuery } from './test-utils';

describe('ErrorState', () => {
  it('renders localized API error', () => {
    renderWithQuery(<ErrorState />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
