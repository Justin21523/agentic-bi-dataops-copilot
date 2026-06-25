import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function SongSearchBox({ onSearch, placeholderKey = 'pages.similar.searchPlaceholder' }: { onSearch: (value: string) => void; placeholderKey?: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(value);
  };
  return (
    <form className="search-row" onSubmit={submit}>
      <input aria-label={t('common.search')} placeholder={t(placeholderKey)} value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="submit">{t('common.search')}</button>
    </form>
  );
}
