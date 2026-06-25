# Frontend Guide

## React Architecture

The frontend uses React, TypeScript, Vite, React Router, TanStack Query, Axios, Recharts, react-i18next, and Vitest.

## Route Map

- `/` Overview
- `/topics` Topic Explorer
- `/sentiment` Sentiment Trends
- `/artists` Artist Style Fingerprint
- `/similar` Similar Songs
- `/genre-classifier` Genre Classifier
- `/timeline` Cultural Timeline
- `/evaluation` Evaluation
- `/licensing` Licensing & Copyright Safety

## Component Hierarchy

`App` renders `RouterProvider`. `AppShell` renders `Sidebar`, `Header`, `LanguageSwitcher`, `SafetyNotice`, and page routes. Pages compose common state components, search components, artist/song cards, and chart components.

Topic Explorer supports click-to-related-songs. Similar Songs supports TF-IDF, topic-vector, and style-embedding method selection. Evaluation renders metric cards for the model and safety audit summary.

## i18n Design

Default locale is `zh-TW`. English is `en-US`. All UI labels are stored in `src/i18n/locales/zh-TW.json` and `src/i18n/locales/en-US.json`. Components should call `t("key")` for labels, buttons, chart titles, empty states, and error states.

## API Client Design

`src/api/client.ts` exports the Axios instance. `src/api/lyricsApi.ts` groups typed API methods used by TanStack Query hooks.

## Testing Strategy

Vitest and React Testing Library cover default locale, language switching, safe rendering, song search behavior, and error states.
