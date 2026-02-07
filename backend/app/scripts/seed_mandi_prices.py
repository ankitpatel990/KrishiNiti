"""
Seed Mandi Prices Script

Loads mandi prices from JSON file into the database for testing and demo purposes.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal, init_db
from app.models import MandiPrice


def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime object."""
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now()


def seed_mandi_prices(db: Session, data_file: Path) -> dict:
    """
    Seed mandi prices from JSON file into the database.
    
    Returns:
        dict with counts of created and skipped records
    """
    if not data_file.exists():
        print(f"  Error: Data file not found: {data_file}")
        return {"created": 0, "skipped": 0, "error": "File not found"}
    
    with open(data_file, "r", encoding="utf-8") as f:
        prices = json.load(f)
    
    print(f"  Loaded {len(prices)} price records from JSON")
    
    created = 0
    skipped = 0
    
    for price_data in prices:
        try:
            # Check if record already exists
            existing = db.query(MandiPrice).filter(
                MandiPrice.commodity == price_data["commodity"],
                MandiPrice.mandi_name == price_data["mandi_name"],
                MandiPrice.arrival_date == parse_date(price_data["arrival_date"])
            ).first()
            
            if existing:
                skipped += 1
                continue
            
            # Create new price record
            price = MandiPrice(
                commodity=price_data["commodity"],
                mandi_name=price_data["mandi_name"],
                state=price_data["state"],
                district=price_data["district"],
                price_per_quintal=price_data["price_per_quintal"],
                arrival_date=parse_date(price_data["arrival_date"]),
                min_price=price_data.get("min_price"),
                max_price=price_data.get("max_price"),
                modal_price=price_data.get("modal_price")
            )
            db.add(price)
            created += 1
            
        except Exception as e:
            print(f"  Error adding price: {e}")
            skipped += 1
    
    db.commit()
    return {"created": created, "skipped": skipped}


def main():
    """Main entry point for seeding mandi prices."""
    print("=" * 60)
    print("FarmHelp Mandi Prices Seeding Script")
    print("=" * 60)
    
    # Initialize database tables
    print("\nInitializing database...")
    init_db()
    
    # Data file path
    data_dir = Path(__file__).parent.parent.parent / "data"
    data_file = data_dir / "mandi_prices.json"
    
    print(f"\nLoading data from: {data_file}")
    
    # Create session and seed prices
    db = SessionLocal()
    try:
        print("\nSeeding mandi prices...")
        result = seed_mandi_prices(db, data_file)
        
        print("\n" + "-" * 40)
        print(f"Summary: {result['created']} created, {result['skipped']} skipped")
        print("-" * 40)
        
        # Summary stats
        commodities = db.query(MandiPrice.commodity).distinct().all()
        total = db.query(MandiPrice).count()
        
        print(f"\nTotal records in database: {total}")
        print(f"Commodities: {', '.join([c[0] for c in commodities])}")
        
    finally:
        db.close()
    
    print("\nDone!")
    print("=" * 60)


if __name__ == "__main__":
    main()
