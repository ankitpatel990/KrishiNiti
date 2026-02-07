"""
Seed Users Script

Creates initial dummy users in the database for testing and demo purposes.
"""

import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import SessionLocal, init_db
from app.models import User


SEED_USERS = [
    {
        "mobile_number": "9876543210",
        "name": "Josh Patel",
        "state": "Gujarat",
        "district": "Rajkot",
        "taluka": "Gondal",
        "is_active": 1
    }
]


def seed_users(db: Session) -> dict:
    """
    Seed initial users into the database.
    
    Returns:
        dict with counts of created and skipped users
    """
    created = 0
    skipped = 0
    
    for user_data in SEED_USERS:
        try:
            # Check if user already exists
            existing = db.query(User).filter(
                User.mobile_number == user_data["mobile_number"]
            ).first()
            
            if existing:
                print(f"  Skipped (exists): {user_data['name']} ({user_data['mobile_number']})")
                skipped += 1
                continue
            
            # Create new user
            user = User(**user_data)
            db.add(user)
            db.commit()
            
            print(f"  Created: {user_data['name']} ({user_data['mobile_number']})")
            created += 1
            
        except IntegrityError as e:
            db.rollback()
            print(f"  Error (integrity): {user_data['name']} - {str(e)}")
            skipped += 1
        except Exception as e:
            db.rollback()
            print(f"  Error: {user_data['name']} - {str(e)}")
            skipped += 1
    
    return {"created": created, "skipped": skipped}


def main():
    """Main entry point for seeding users."""
    print("=" * 60)
    print("FarmHelp User Seeding Script")
    print("=" * 60)
    
    # Initialize database tables
    print("\nInitializing database...")
    init_db()
    
    # Create session and seed users
    db = SessionLocal()
    try:
        print("\nSeeding users...")
        result = seed_users(db)
        
        print("\n" + "-" * 40)
        print(f"Summary: {result['created']} created, {result['skipped']} skipped")
        print("-" * 40)
        
        # List all users
        print("\nAll users in database:")
        users = db.query(User).all()
        for user in users:
            print(f"  - {user.name} | {user.mobile_number} | {user.state}, {user.district}, {user.taluka}")
        
    finally:
        db.close()
    
    print("\nDone!")
    print("=" * 60)


if __name__ == "__main__":
    main()
