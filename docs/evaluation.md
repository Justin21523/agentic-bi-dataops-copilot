# Evaluation

Evaluation scripts compute:

- classification accuracy
- macro-F1
- retrieval Recall@K
- nDCG@K
- simplified topic coherence
- no-raw-lyrics safety pass/fail
- confusion matrix
- per-genre precision/recall/F1
- retrieval examples

Run:

```bash
make evaluate
```

For a clean end-to-end refresh, run:

```bash
make data-ready
```
