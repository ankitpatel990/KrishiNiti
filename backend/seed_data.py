"""
Seed Data Script

This script provides utilities for seeding additional test data
into the database. Useful for testing and development.
"""

import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta
from random import uniform, choice

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import get_db_context
from app.models import DiseaseTreatment, MandiPrice

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def seed_additional_diseases():
    """Add additional test diseases"""
    additional_diseases = [
        {
            "disease_name": "Test Disease 1",
            "disease_name_hindi": "परीक्षण रोग 1",
            "crop_type": "Paddy",
            "symptoms": "Test symptoms for testing purposes. This is a sample disease entry for development and testing.",
            "treatment_chemical": "Test chemical treatment",
            "treatment_organic": "Test organic treatment",
            "dosage": "Test dosage",
            "cost_per_acre": 400.0,
            "prevention_tips": "Test prevention tips",
            "affected_stages": "Tillering, Flowering"
        },
        {
            "disease_name": "Test Disease 2",
            "disease_name_hindi": "परीक्षण रोग 2",
            "crop_type": "Wheat",
            "symptoms": "Test symptoms for testing purposes. This is a sample disease entry for development and testing.",
            "treatment_chemical": "Test chemical treatment",
            "treatment_organic": "Test organic treatment",
            "dosage": "Test dosage",
            "cost_per_acre": 450.0,
            "prevention_tips": "Test prevention tips",
            "affected_stages": "Booting, Heading"
        }
    ]
    
    try:
        with get_db_context() as db:
            inserted = 0
            for disease in additional_diseases:
                # Check if already exists
                existing = db.query(DiseaseTreatment).filter(
                    DiseaseTreatment.disease_name == disease["disease_name"]
                ).first()
                
                if existing:
                    logger.info(f"Disease '{disease['disease_name']}' already exists, skipping")
                    continue
                
                disease_obj = DiseaseTreatment(**disease)
                db.add(disease_obj)
                inserted += 1
            
            db.commit()
            logger.info(f"Inserted {inserted} additional disease records")
            return inserted
    except Exception as e:
        logger.error(f"Error seeding additional diseases: {str(e)}")
        return 0


def seed_additional_mandi_prices():
    """Add additional test mandi prices with recent dates"""
    commodities = ["Wheat", "Rice", "Cotton", "Sugarcane", "Onion", "Tomato", "Potato"]
    states = ["Punjab", "Haryana", "Uttar Pradesh", "Maharashtra", "Gujarat"]
    districts = {
        "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Bathinda"],
        "Haryana": ["Karnal", "Sonipat", "Rohtak", "Hisar"],
        "Uttar Pradesh": ["Meerut", "Aligarh", "Agra", "Kanpur"],
        "Maharashtra": ["Pune", "Nashik", "Ahmednagar", "Kolhapur"],
        "Gujarat": ["Ahmedabad", "Surat", "Rajkot", "Vadodara"]
    }
    
    try:
        with get_db_context() as db:
            inserted = 0
            base_date = datetime.now()
            
            for i in range(10):  # Add 10 additional price records
                commodity = choice(commodities)
                state = choice(states)
                district = choice(districts[state])
                
                # Generate realistic prices based on commodity
                base_prices = {
                    "Wheat": 2200,
                    "Rice": 1850,
                    "Cotton": 7200,
                    "Sugarcane": 315,
                    "Onion": 2800,
                    "Tomato": 1200,
                    "Potato": 800
                }
                
                base_price = base_prices[commodity]
                price_per_quintal = round(uniform(base_price * 0.95, base_price * 1.05), 2)
                min_price = round(price_per_quintal * 0.95, 2)
                max_price = round(price_per_quintal * 1.05, 2)
                modal_price = round(price_per_quintal, 2)
                
                price_data = {
                    "commodity": commodity,
                    "mandi_name": f"{district} Test Mandi",
                    "state": state,
                    "district": district,
                    "price_per_quintal": price_per_quintal,
                    "arrival_date": base_date - timedelta(days=i),
                    "min_price": min_price,
                    "max_price": max_price,
                    "modal_price": modal_price
                }
                
                price_obj = MandiPrice(**price_data)
                db.add(price_obj)
                inserted += 1
            
            db.commit()
            logger.info(f"Inserted {inserted} additional mandi price records")
            return inserted
    except Exception as e:
        logger.error(f"Error seeding additional mandi prices: {str(e)}")
        return 0


def clear_test_data():
    """Remove test data (diseases and prices with 'Test' in name)"""
    try:
        with get_db_context() as db:
            # Remove test diseases
            test_diseases = db.query(DiseaseTreatment).filter(
                DiseaseTreatment.disease_name.like("%Test%")
            ).all()
            disease_count = len(test_diseases)
            for disease in test_diseases:
                db.delete(disease)
            
            # Remove test mandi prices
            test_prices = db.query(MandiPrice).filter(
                MandiPrice.mandi_name.like("%Test%")
            ).all()
            price_count = len(test_prices)
            for price in test_prices:
                db.delete(price)
            
            db.commit()
            logger.info(f"Removed {disease_count} test diseases and {price_count} test prices")
            return disease_count, price_count
    except Exception as e:
        logger.error(f"Error clearing test data: {str(e)}")
        return 0, 0


def main():
    """Main seeding function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed additional test data")
    parser.add_argument(
        "--diseases",
        action="store_true",
        help="Seed additional diseases"
    )
    parser.add_argument(
        "--prices",
        action="store_true",
        help="Seed additional mandi prices"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Seed all additional data"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear test data"
    )
    
    args = parser.parse_args()
    
    if args.clear:
        logger.info("Clearing test data...")
        clear_test_data()
        return
    
    if args.all:
        args.diseases = True
        args.prices = True
    
    if not args.diseases and not args.prices:
        parser.print_help()
        return
    
    logger.info("=" * 60)
    logger.info("Farm Help - Seed Additional Data")
    logger.info("=" * 60)
    
    if args.diseases:
        logger.info("Seeding additional diseases...")
        seed_additional_diseases()
    
    if args.prices:
        logger.info("Seeding additional mandi prices...")
        seed_additional_mandi_prices()
    
    logger.info("=" * 60)
    logger.info("Seeding completed!")


if __name__ == "__main__":
    main()
