"""Synthetic retail data generator. Run via: make sample-data"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import numpy as np
import pandas as pd

from utils.config import get_settings
from utils.log import get_logger

log = get_logger(__name__)

FIRST_NAMES = [
    "Alice", "Bob", "Carol", "David", "Elena", "Frank", "Grace", "Henry",
    "Iris", "Jack", "Karen", "Liam", "Mia", "Noah", "Olivia", "Paul",
    "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xavier",
    "Yara", "Zoe", "Aaron", "Beth", "Chris", "Diana", "Evan", "Fiona",
    "George", "Hannah", "Ivan", "Julia", "Kevin", "Laura", "Mike", "Nancy",
    "Oscar", "Penny", "Reid", "Sophie", "Tom", "Una", "Vera", "Will",
    "Xena", "Zara",
]
LAST_NAMES = [
    "Johnson", "Smith", "Williams", "Brown", "Davis", "Miller", "Wilson",
    "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
    "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark",
    "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young",
    "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green",
    "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell",
    "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker",
    "Evans", "Edwards", "Collins", "Stewart",
]
US_CITIES = [
    ("New York", "NY"), ("Los Angeles", "CA"), ("Chicago", "IL"),
    ("Houston", "TX"), ("Phoenix", "AZ"), ("Philadelphia", "PA"),
    ("San Antonio", "TX"), ("San Diego", "CA"), ("Dallas", "TX"),
    ("San Jose", "CA"), ("Austin", "TX"), ("Seattle", "WA"),
    ("Denver", "CO"), ("Boston", "MA"), ("Nashville", "TN"),
    ("Portland", "OR"), ("Las Vegas", "NV"), ("Memphis", "TN"),
    ("Atlanta", "GA"), ("Miami", "FL"), ("Minneapolis", "MN"),
    ("Raleigh", "NC"), ("Cleveland", "OH"), ("Kansas City", "MO"),
    ("Sacramento", "CA"),
]
SEGMENTS = ["B2C", "B2C", "B2C", "B2B", "SMB"]

PRODUCT_CATALOG = [
    ("Wireless Bluetooth Headphones", "Electronics", "Audio", 79.99, 35.0),
    ("USB-C Charging Cable 6ft", "Electronics", "Accessories", 12.99, 4.0),
    ("Portable Power Bank 10000mAh", "Electronics", "Accessories", 29.99, 12.0),
    ("Laptop Stand Adjustable", "Electronics", "Accessories", 34.99, 14.0),
    ("Mechanical Keyboard TKL", "Electronics", "Peripherals", 89.99, 40.0),
    ("Wireless Mouse Ergonomic", "Electronics", "Peripherals", 39.99, 16.0),
    ("Monitor 24-inch 1080p", "Electronics", "Displays", 199.99, 90.0),
    ("Webcam 1080p HD", "Electronics", "Accessories", 49.99, 20.0),
    ("Smart Speaker Mini", "Electronics", "Audio", 59.99, 25.0),
    ("Noise Cancelling Earbuds", "Electronics", "Audio", 129.99, 55.0),
    ("Men's Running Shoes", "Apparel", "Footwear", 89.99, 35.0),
    ("Women's Yoga Pants", "Apparel", "Activewear", 49.99, 18.0),
    ("Men's Casual T-Shirt", "Apparel", "Tops", 24.99, 8.0),
    ("Women's Winter Jacket", "Apparel", "Outerwear", 149.99, 60.0),
    ("Men's Slim-Fit Jeans", "Apparel", "Bottoms", 59.99, 22.0),
    ("Women's Summer Dress", "Apparel", "Dresses", 44.99, 16.0),
    ("Unisex Baseball Cap", "Apparel", "Accessories", 19.99, 7.0),
    ("Athletic Socks 6-Pack", "Apparel", "Accessories", 14.99, 5.0),
    ("Hoodie Zip-Up", "Apparel", "Tops", 54.99, 20.0),
    ("Leggings High-Waist", "Apparel", "Activewear", 39.99, 14.0),
    ("Non-Stick Frying Pan Set", "Home & Garden", "Cookware", 49.99, 20.0),
    ("Coffee Maker 12-Cup", "Home & Garden", "Kitchen", 79.99, 32.0),
    ("Air Purifier HEPA", "Home & Garden", "Appliances", 129.99, 55.0),
    ("Blackout Curtains Pair", "Home & Garden", "Decor", 39.99, 15.0),
    ("Bamboo Cutting Board Set", "Home & Garden", "Kitchen", 29.99, 11.0),
    ("Indoor Plant Pot Set 3-Pack", "Home & Garden", "Garden", 24.99, 9.0),
    ("Vacuum Cleaner Robot", "Home & Garden", "Appliances", 249.99, 110.0),
    ("Scented Candle Set", "Home & Garden", "Decor", 19.99, 7.0),
    ("Storage Ottoman", "Home & Garden", "Furniture", 89.99, 38.0),
    ("Throw Pillow Set", "Home & Garden", "Decor", 34.99, 13.0),
    ("Yoga Mat Non-Slip", "Sports & Outdoors", "Fitness", 29.99, 11.0),
    ("Resistance Bands Set", "Sports & Outdoors", "Fitness", 19.99, 7.0),
    ("Camping Tent 2-Person", "Sports & Outdoors", "Camping", 149.99, 62.0),
    ("Hiking Backpack 40L", "Sports & Outdoors", "Camping", 89.99, 36.0),
    ("Water Bottle Insulated 32oz", "Sports & Outdoors", "Hydration", 24.99, 9.0),
    ("Jump Rope Speed", "Sports & Outdoors", "Fitness", 14.99, 5.0),
    ("Dumbbells Adjustable Set", "Sports & Outdoors", "Fitness", 199.99, 88.0),
    ("Bike Helmet Adult", "Sports & Outdoors", "Cycling", 59.99, 24.0),
    ("Foam Roller Massage", "Sports & Outdoors", "Recovery", 24.99, 9.0),
    ("Sports Water Bottle 24oz", "Sports & Outdoors", "Hydration", 19.99, 7.0),
    ("Python Crash Course Book", "Books", "Programming", 39.99, 15.0),
    ("Data Science Handbook", "Books", "Data Science", 49.99, 19.0),
    ("The Art of War", "Books", "Classics", 9.99, 3.0),
    ("Atomic Habits", "Books", "Self-Help", 16.99, 6.0),
    ("Clean Code", "Books", "Programming", 44.99, 17.0),
    ("Deep Work", "Books", "Productivity", 18.99, 7.0),
    ("Thinking Fast and Slow", "Books", "Psychology", 17.99, 7.0),
    ("The Lean Startup", "Books", "Business", 19.99, 8.0),
    ("Designing Data-Intensive Apps", "Books", "Programming", 59.99, 23.0),
    ("Sapiens", "Books", "History", 18.99, 7.0),
    ("LEGO Classic Large Set", "Toys", "Building", 89.99, 38.0),
    ("Board Game Pandemic", "Toys", "Board Games", 44.99, 18.0),
    ("Rubik's Cube 3x3", "Toys", "Puzzles", 9.99, 3.5),
    ("RC Car Off-Road", "Toys", "Remote Control", 49.99, 20.0),
    ("Jigsaw Puzzle 1000pc", "Toys", "Puzzles", 19.99, 7.0),
    ("Stuffed Animal Bear", "Toys", "Plush", 24.99, 9.0),
    ("Play-Doh Starter Set", "Toys", "Arts & Crafts", 14.99, 5.0),
    ("Card Game Uno", "Toys", "Card Games", 7.99, 2.5),
    ("Magnetic Drawing Board", "Toys", "Educational", 19.99, 7.0),
    ("Science Experiment Kit", "Toys", "Educational", 34.99, 13.0),
    ("Face Moisturizer SPF 30", "Beauty", "Skincare", 29.99, 11.0),
    ("Shampoo Argan Oil", "Beauty", "Haircare", 19.99, 7.0),
    ("Electric Toothbrush", "Beauty", "Oral Care", 49.99, 20.0),
    ("Perfume Floral 50ml", "Beauty", "Fragrance", 59.99, 22.0),
    ("Makeup Brush Set 12pc", "Beauty", "Makeup", 24.99, 9.0),
    ("Vitamin C Serum", "Beauty", "Skincare", 34.99, 13.0),
    ("Hair Dryer 1875W", "Beauty", "Haircare", 44.99, 17.0),
    ("Sunscreen SPF 50+", "Beauty", "Skincare", 19.99, 7.0),
    ("Lip Balm Set 6-Pack", "Beauty", "Lip Care", 12.99, 4.5),
    ("Nail Polish Set 20 Colors", "Beauty", "Nails", 22.99, 8.0),
    ("Organic Coffee Beans 1kg", "Food & Grocery", "Coffee & Tea", 24.99, 9.0),
    ("Green Tea Matcha 100g", "Food & Grocery", "Coffee & Tea", 19.99, 7.0),
    ("Protein Bars Variety 24-Pack", "Food & Grocery", "Snacks", 34.99, 13.0),
    ("Olive Oil Extra Virgin 1L", "Food & Grocery", "Oils & Vinegars", 19.99, 7.0),
    ("Dark Chocolate 72% 3-Pack", "Food & Grocery", "Confectionery", 14.99, 5.0),
    ("Granola Bars Oat 12-Pack", "Food & Grocery", "Snacks", 12.99, 4.5),
    ("Honey Raw Organic 500g", "Food & Grocery", "Sweeteners", 17.99, 7.0),
    ("Mixed Nuts Roasted 500g", "Food & Grocery", "Snacks", 22.99, 8.5),
    ("Vitamin D3 Supplement 90ct", "Food & Grocery", "Supplements", 19.99, 7.0),
    ("Whey Protein Powder 1kg", "Food & Grocery", "Supplements", 49.99, 20.0),
    ("USB Hub 7-Port", "Electronics", "Accessories", 29.99, 11.0),
    ("Desk Lamp LED Adjustable", "Home & Garden", "Lighting", 39.99, 15.0),
    ("Running Belt Waist Pack", "Sports & Outdoors", "Accessories", 17.99, 6.5),
    ("Cookbook: 30-Minute Meals", "Books", "Cooking", 29.99, 11.0),
    ("Dart Board Set", "Toys", "Games", 39.99, 15.0),
    ("Face Wash Gentle Foam", "Beauty", "Skincare", 17.99, 6.5),
    ("Trail Mix Variety 6-Pack", "Food & Grocery", "Snacks", 19.99, 7.5),
    ("Portable Bluetooth Speaker", "Electronics", "Audio", 49.99, 20.0),
    ("Hand Weights 5lb Pair", "Sports & Outdoors", "Fitness", 24.99, 9.0),
    ("Photo Book DIY Kit", "Toys", "Arts & Crafts", 27.99, 10.0),
    ("Face Mask Sheet 10-Pack", "Beauty", "Skincare", 15.99, 5.5),
    ("Coffee Mug Ceramic 16oz", "Home & Garden", "Kitchen", 14.99, 5.0),
    ("Plant-Based Protein 500g", "Food & Grocery", "Supplements", 39.99, 15.0),
    ("Ergonomic Chair Cushion", "Home & Garden", "Furniture", 44.99, 17.0),
    ("Crossword Puzzle Book", "Books", "Puzzles", 11.99, 4.0),
    ("Resistance Tube Kit", "Sports & Outdoors", "Fitness", 22.99, 8.5),
    ("Pore Minimizing Toner", "Beauty", "Skincare", 26.99, 10.0),
    ("Instant Oats 1kg", "Food & Grocery", "Breakfast", 9.99, 3.5),
    ("Power Strip 6-Outlet", "Electronics", "Accessories", 19.99, 7.0),
]

REVIEW_TEMPLATES = {
    5: [
        "Excellent product! Highly recommend.",
        "Exceeded my expectations. Will buy again.",
        "Perfect quality for the price.",
        "Absolutely love it! Fast shipping too.",
        "Five stars — nothing to complain about.",
    ],
    4: [
        "Good quality, works as described.",
        "Happy with the purchase overall.",
        "Solid product, minor packaging issue.",
        "Great value for money.",
        "Would recommend to others.",
    ],
    3: [
        "Decent product but room for improvement.",
        "Average quality. Does the job.",
        "Mixed feelings — pros and cons.",
        "Okay for the price, not exceptional.",
        "Meets basic expectations.",
    ],
    2: [
        "Disappointed with the quality.",
        "Not quite as described.",
        "Had some issues but usable.",
        "Expected better for this price.",
        "Would not buy again.",
    ],
    1: [
        "Poor quality. Not as advertised.",
        "Arrived damaged and unusable.",
        "Complete waste of money.",
        "Terrible product, returning immediately.",
        "Do not recommend at all.",
    ],
}


def generate_products(n: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate product catalog with categories, prices, and COGS."""
    catalog = PRODUCT_CATALOG[:n]
    rows = []
    for i, (name, category, subcategory, price, cost) in enumerate(catalog):
        rows.append({
            "product_id": f"PROD-{i+1:03d}",
            "name": name,
            "category": category,
            "subcategory": subcategory,
            "price": price,
            "cost": cost,
            "stock_quantity": int(rng.integers(0, 500)),
            "is_active": True,
            "created_at": "2023-01-01 00:00:00",
        })
    return pd.DataFrame(rows)


def generate_customers(n: int, rng: np.random.Generator) -> pd.DataFrame:
    """Generate customer dimension with US geographic distribution."""
    rows = []
    for i in range(n):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        city, state = US_CITIES[int(rng.integers(0, len(US_CITIES)))]
        signup_days_ago = int(rng.integers(30, 900))
        signup_date = pd.Timestamp("2025-06-24") - pd.Timedelta(days=signup_days_ago)
        rows.append({
            "customer_id": f"CUST-{i+1:04d}",
            "name": f"{first} {last}",
            "email": f"{first.lower()}.{last.lower()}{i+1}@example.com",
            "city": city,
            "state": state,
            "country": "US",
            "segment": rng.choice(SEGMENTS),
            "signup_date": signup_date.date().isoformat(),
            "created_at": signup_date.isoformat(),
        })
    return pd.DataFrame(rows)


def generate_orders(
    customers: pd.DataFrame,
    n: int,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Generate orders with realistic status distribution and seasonal pattern."""
    statuses = ["completed"] * 75 + ["pending"] * 10 + ["cancelled"] * 10 + ["returned"] * 5
    customer_ids = customers["customer_id"].tolist()
    countries = customers.set_index("customer_id")["country"].to_dict()
    cities = customers.set_index("customer_id")["city"].to_dict()
    states = customers.set_index("customer_id")["state"].to_dict()

    start = pd.Timestamp("2023-01-01")
    end = pd.Timestamp("2025-06-01")
    date_range_days = (end - start).days

    rows = []
    for i in range(n):
        cust_id = rng.choice(customer_ids)
        days_offset = int(rng.integers(0, date_range_days))
        order_date = start + pd.Timedelta(days=days_offset)
        # Add intraday time
        hour = int(rng.integers(8, 22))
        minute = int(rng.integers(0, 60))
        order_date = order_date.replace(hour=hour, minute=minute)
        rows.append({
            "order_id": f"ORD-{i+1:06d}",
            "customer_id": cust_id,
            "order_date": order_date.isoformat(),
            "status": rng.choice(statuses),
            "shipping_city": cities.get(cust_id),
            "shipping_state": states.get(cust_id),
            "shipping_country": countries.get(cust_id, "US"),
            "total_amount": None,  # back-filled after items
            "created_at": order_date.isoformat(),
        })
    return pd.DataFrame(rows)


def generate_order_items(
    orders: pd.DataFrame,
    products: pd.DataFrame,
    rng: np.random.Generator,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Generate order items and back-fill orders.total_amount."""
    product_ids = products["product_id"].tolist()
    prices = products.set_index("product_id")["price"].to_dict()

    items = []
    order_totals: dict[str, float] = {}
    item_counter = 0

    for _, order in orders.iterrows():
        n_items = max(1, min(8, int(rng.poisson(2.5))))
        chosen = rng.choice(product_ids, size=n_items, replace=True)
        order_total = 0.0

        for prod_id in chosen:
            item_counter += 1
            base_price = prices[prod_id]
            unit_price = round(base_price * float(rng.uniform(0.95, 1.05)), 2)
            quantity = int(rng.integers(1, 5))
            discount = round(float(rng.choice([0.0] * 8 + [0.05, 0.10, 0.15, 0.20])), 2)
            line_total = round(quantity * unit_price * (1 - discount), 2)
            order_total += line_total
            items.append({
                "order_item_id": f"ITEM-{item_counter:06d}",
                "order_id": order["order_id"],
                "product_id": prod_id,
                "quantity": quantity,
                "unit_price": unit_price,
                "discount": discount,
                "line_total": line_total,
            })
        order_totals[order["order_id"]] = round(order_total, 2)

    orders = orders.copy()
    orders["total_amount"] = orders["order_id"].map(order_totals)
    return pd.DataFrame(items), orders


def generate_payments(
    orders: pd.DataFrame,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Generate one payment per order matching order status."""
    methods = ["credit_card"] * 50 + ["paypal"] * 25 + ["bank_transfer"] * 15 + ["cod"] * 10
    status_map = {
        "completed": "completed",
        "pending": "completed",
        "cancelled": "failed",
        "returned": "refunded",
    }

    rows = []
    for i, (_, order) in enumerate(orders.iterrows()):
        pay_status = status_map.get(order["status"], "completed")
        paid_at = None
        if pay_status in ("completed", "refunded"):
            order_ts = pd.Timestamp(order["order_date"])
            paid_at = (order_ts + pd.Timedelta(hours=float(rng.uniform(0.5, 48)))).isoformat()
        rows.append({
            "payment_id": f"PAY-{i+1:06d}",
            "order_id": order["order_id"],
            "method": rng.choice(methods),
            "amount": order["total_amount"],
            "currency": "USD",
            "status": pay_status,
            "paid_at": paid_at,
        })
    return pd.DataFrame(rows)


def generate_reviews(
    orders: pd.DataFrame,
    order_items: pd.DataFrame,
    products: pd.DataFrame,
    review_rate: float,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Generate reviews for completed orders at given review_rate."""
    completed = orders[orders["status"] == "completed"]["order_id"].tolist()
    items_by_order = order_items.groupby("order_id")["product_id"].apply(list).to_dict()
    cust_by_order = orders.set_index("order_id")["customer_id"].to_dict()
    date_by_order = orders.set_index("order_id")["order_date"].to_dict()

    rows = []
    rev_counter = 0
    for order_id in completed:
        if rng.random() > review_rate:
            continue
        rev_counter += 1
        prod_ids = items_by_order.get(order_id, [])
        prod_id = rng.choice(prod_ids) if prod_ids else None
        cust_id = cust_by_order.get(order_id)
        order_ts = pd.Timestamp(date_by_order.get(order_id, "2024-01-01"))
        review_ts = (order_ts + pd.Timedelta(days=float(rng.uniform(1, 30)))).isoformat()

        # Score biased toward 4-5
        weights = [2, 5, 10, 35, 48]
        score = int(rng.choice([1, 2, 3, 4, 5], p=[w / sum(weights) for w in weights]))
        comment = rng.choice(REVIEW_TEMPLATES[score])
        rows.append({
            "review_id": f"REV-{rev_counter:06d}",
            "order_id": order_id,
            "product_id": prod_id,
            "customer_id": cust_id,
            "score": score,
            "comment": comment,
            "created_at": review_ts,
        })
    return pd.DataFrame(rows)


def main() -> None:
    """Generate all synthetic retail data and write CSVs to data/sample/."""
    settings = get_settings()
    out_dir = Path(settings.sample_data_path)
    out_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(settings.sample_seed)

    log.info("Generating products...")
    products = generate_products(settings.sample_products, rng)
    products.to_csv(out_dir / "products.csv", index=False)

    log.info("Generating customers...")
    customers = generate_customers(settings.sample_customers, rng)
    customers.to_csv(out_dir / "customers.csv", index=False)

    log.info("Generating orders...")
    orders_raw = generate_orders(customers, settings.sample_orders, rng)

    log.info("Generating order items...")
    order_items, orders = generate_order_items(orders_raw, products, rng)
    orders.to_csv(out_dir / "orders.csv", index=False)
    order_items.to_csv(out_dir / "order_items.csv", index=False)

    log.info("Generating payments...")
    payments = generate_payments(orders, rng)
    payments.to_csv(out_dir / "payments.csv", index=False)

    log.info("Generating reviews...")
    reviews = generate_reviews(orders, order_items, products, review_rate=0.60, rng=rng)
    reviews.to_csv(out_dir / "reviews.csv", index=False)

    log.info("")
    log.info("Sample data written to %s", out_dir)
    log.info("  products:    %5d rows", len(products))
    log.info("  customers:   %5d rows", len(customers))
    log.info("  orders:      %5d rows", len(orders))
    log.info("  order_items: %5d rows", len(order_items))
    log.info("  payments:    %5d rows", len(payments))
    log.info("  reviews:     %5d rows", len(reviews))


if __name__ == "__main__":
    main()
