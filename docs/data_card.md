# Data Card

Supported data sources are musiXmatch bag-of-words features, WASABI metadata, and locally generated sample metadata.

The sample generator creates 300 default songs, 36 artists, song metadata, artist metadata, BoW term weights, sentiment scores, style vectors, topic assignments, yearly term aggregates, genre predictions, and similarity results. It does not create complete lyric text.

External licensed data can be imported only after local validation. Required normalized inputs are `artists.csv`, `songs.csv`, and `lyric_bow_features.csv`; raw lyric fields are rejected.
