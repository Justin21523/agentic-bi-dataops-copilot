"""Per-table validation and type coercion functions for the retail warehouse."""
from __future__ import annotations

from typing import Callable

import pandas as pd

from utils.log import get_logger

log = get_logger(__name__)

_VALID_ORDER_STATUSES = {"completed", "pending", "cancelled", "returned"}
_VALID_PAYMENT_METHODS = {"credit_card", "paypal", "bank_transfer", "cod"}
_VALID_PAYMENT_STATUSES = {"completed", "refunded", "failed", "pending"}


def clean_customers(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean customer records."""
    n_raw = len(df)
    df = df.dropna(subset=["customer_id", "name"])
    df["signup_date"] = pd.to_datetime(df["signup_date"], errors="coerce").dt.date
    for col in ["name", "email", "city", "state", "country", "segment"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().replace("nan", None)
    df["country"] = df["country"].fillna("US")
    log.info(f"customers: {n_raw} raw → {len(df)} clean rows")
    return df.reset_index(drop=True)


def clean_products(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean product records."""
    n_raw = len(df)
    df = df.dropna(subset=["product_id", "name", "category"])
    df = df[df["price"] > 0].copy()
    df["is_active"] = df["is_active"].astype(str).str.lower().isin(["true", "1", "yes"])
    df["stock_quantity"] = df["stock_quantity"].fillna(0).astype(int)
    df["cost"] = pd.to_numeric(df["cost"], errors="coerce")
    log.info(f"products: {n_raw} raw → {len(df)} clean rows")
    return df.reset_index(drop=True)


def clean_orders(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean order records."""
    n_raw = len(df)
    df = df.dropna(subset=["order_id", "customer_id"])
    df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
    df = df.dropna(subset=["order_date"])
    df["status"] = df["status"].where(
        df["status"].isin(_VALID_ORDER_STATUSES), other="pending"
    )
    df["total_amount"] = pd.to_numeric(df["total_amount"], errors="coerce").round(2)
    log.info(f"orders: {n_raw} raw → {len(df)} clean rows")
    return df.reset_index(drop=True)


def clean_order_items(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean order item records."""
    n_raw = len(df)
    df = df.dropna(subset=["order_item_id", "order_id", "product_id"])
    df = df[(df["quantity"] > 0) & (df["unit_price"] > 0)].copy()
    df["discount"] = df["discount"].clip(0.0, 1.0).fillna(0.0)
    df["line_total"] = (df["quantity"] * df["unit_price"] * (1 - df["discount"])).round(2)
    log.info(f"order_items: {n_raw} raw → {len(df)} clean rows")
    return df.reset_index(drop=True)


def clean_payments(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean payment records."""
    n_raw = len(df)
    df = df.dropna(subset=["payment_id", "order_id"])
    df = df[df["amount"] > 0].copy()
    df["method"] = df["method"].where(
        df["method"].isin(_VALID_PAYMENT_METHODS), other="credit_card"
    )
    df["status"] = df["status"].where(
        df["status"].isin(_VALID_PAYMENT_STATUSES), other="completed"
    )
    df["paid_at"] = pd.to_datetime(df["paid_at"], errors="coerce")
    log.info(f"payments: {n_raw} raw → {len(df)} clean rows")
    return df.reset_index(drop=True)


def clean_reviews(df: pd.DataFrame) -> pd.DataFrame:
    """Validate and clean review records."""
    n_raw = len(df)
    df = df.dropna(subset=["review_id", "order_id", "customer_id"])
    df = df[(df["score"] >= 1) & (df["score"] <= 5)].copy()
    df["score"] = df["score"].astype(int)
    if "comment" in df.columns:
        df["comment"] = df["comment"].astype(str).str.strip()
        df["comment"] = df["comment"].replace({"": None, "nan": None})
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    log.info(f"reviews: {n_raw} raw → {len(df)} clean rows")
    return df.reset_index(drop=True)


TABLE_CLEANERS: dict[str, Callable[[pd.DataFrame], pd.DataFrame]] = {
    "customers": clean_customers,
    "products": clean_products,
    "orders": clean_orders,
    "order_items": clean_order_items,
    "payments": clean_payments,
    "reviews": clean_reviews,
}
