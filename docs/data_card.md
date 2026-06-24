# Data Card: Synthetic Retail Dataset

## Summary

| Property | Value |
|---|---|
| Dataset name | Synthetic Retail Warehouse |
| Purpose | Portfolio / research demonstration |
| License | MIT (synthetic, no personal data) |
| Scale | ~3,700+ rows across 7 tables |
| Generator | `scripts/generate_sample_data.py` |
| Seed | `np.random.default_rng(42)` — fully reproducible |

---

## Dataset Description

This is a **fully synthetic** retail dataset generated programmatically. It does not contain any real customer data, personal information, or proprietary business data. All names, emails, and transactions are fictional.

The dataset simulates a mid-size e-commerce company selling across 8 product categories.

---

## Tables

### customers (300 rows)

| Column | Description |
|---|---|
| customer_id | UUID-style identifier (CUST-NNNN) |
| name | Fictional US name |
| email | Fictional email derived from name |
| city / state / country | US cities with realistic state mappings |
| segment | B2C (60%), B2B (25%), SMB (15%) |
| signup_date | 2021-01-01 to 2024-06-01 |

### products (100 rows)

| Column | Description |
|---|---|
| product_id | PROD-NNN |
| name | 100 distinct realistic product names |
| category | 8 categories: Electronics, Sports & Outdoors, Books, Home & Garden, Apparel, Food & Grocery, Beauty, Toys |
| price / cost | Price ranges by category (cost = 35-50% of price) |
| stock_quantity | 10–200 units |
| is_active | 90% active |

### orders (750 rows)

| Column | Description |
|---|---|
| order_date | 2022-01-01 to 2024-06-15 |
| status | completed (75%), pending (10%), cancelled (10%), returned (5%) |
| total_amount | Back-filled from order_items after generation |

### order_items (~2,200 rows)

| Column | Description |
|---|---|
| quantity | 1–5 units per item |
| unit_price | Equal to product.price at time of order |
| discount | 0% (70%), 5-30% (30%) |
| line_total | unit_price × quantity × (1 - discount) |

### payments (750 rows)

| Column | Description |
|---|---|
| method | credit_card (50%), paypal (25%), bank_transfer (15%), cod (10%) |
| status | completed (85%), failed (5%), refunded (5%), pending (5%) |
| paid_at | order_date + 0–2 hours (NULL for failed) |

### reviews (~450 rows)

| Column | Description |
|---|---|
| score | 1–5 stars, biased toward 4-5 (realistic) |
| comment | Short English comment matching score tone |
| Coverage | ~60% of completed orders have a review |

### daily_sales (materialized)

Pre-aggregated from orders + payments via ETL CTE. Demonstrates the data warehouse pattern of pre-computing daily metrics. Not loaded from CSV — always re-materialized by `make etl`.

---

## Generation Details

```python
rng = np.random.default_rng(42)  # reproducible, passed explicitly to all functions
```

Generation order ensures referential integrity:

```
products → customers → orders → order_items (back-fills order.total_amount) → payments → reviews
```

All foreign keys are checked at write time by DuckDB constraints (informational).

---

## Limitations

- **No real seasonality** — date distribution is roughly uniform over the date range.
- **No customer lifetime value model** — repeat purchase rate is random, not driven by modeled CLV.
- **No product co-purchase patterns** — items per order are randomly selected, not based on market baskets.
- **Small scale** — designed for fast local DuckDB queries, not to stress-test performance.

---

## Ethical Notes

This dataset is entirely fictional. It was generated to demonstrate a data analytics system without using any real personal data. No inference, re-identification, or deployment against real individuals is implied or intended.
