# API Contract

All endpoints are prefixed by `/api/v1`.

- `GET /health`
- `GET /songs/search`
- `GET /songs/{song_id}`
- `GET /songs/{song_id}/similar`
- `GET /songs/{song_id}/topics`
- `GET /songs/{song_id}/sentiment`
- `GET /artists/search`
- `GET /artists/{artist_id}`
- `GET /artists/{artist_id}/style`
- `GET /artists/{artist_id}/songs`
- `GET /analytics/overview`
- `GET /analytics/filter-options`
- `GET /analytics/highlights`
- `GET /analytics/topics`
- `GET /analytics/topic-quality`
- `GET /analytics/topics/{topic_id}/terms`
- `GET /analytics/drilldown/songs`
- `GET /analytics/sentiment-trends`
- `GET /analytics/yearly-terms`
- `GET /analytics/decade-trends`
- `GET /analytics/genre-sentiment`
- `GET /analytics/language-culture`
- `GET /analytics/artist-style-clusters`
- `GET /analytics/genre-leakage`
- `GET /analytics/topics/{topic_id}/songs`
- `GET /analytics/genres`
- `GET /analytics/languages`
- `POST /models/genre-classifier/predict`
- `GET /models/evaluation`
- `GET /data-quality/report`
- `GET /songs/{song_id}/similar/explanations`
- `GET /export/{resource}.csv`
- `GET /safety/policy`
- `GET /safety/audit`

Song-related responses must expose metadata and derived outputs only.
