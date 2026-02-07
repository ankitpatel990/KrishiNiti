"""
Database Initialization Script

This script initializes the database by:
1. Creating all tables
2. Loading and validating sample data from JSON files
3. Populating the database with validated data
4. Verifying data insertion
"""

import sys
import logging
from pathlib import Path
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import init_db, get_db_context, check_db_connection, Base, engine
from app.models import DiseaseTreatment, WeatherCache, MandiPrice
from app.utils.validators import (
    load_and_validate_diseases,
    load_and_validate_mandi_prices,
    load_and_validate_weather_alerts
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_tables():
    """Create all database tables"""
    try:
        logger.info("Creating database tables...")
        init_db()
        logger.info("Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating tables: {str(e)}")
        return False


def load_diseases(data_dir: Path):
    """Load and insert disease data"""
    try:
        is_valid, diseases, errors = load_and_validate_diseases(data_dir)
        
        if not is_valid:
            logger.error(f"Validation errors: {errors}")
            return False, 0
        
        if not diseases:
            logger.warning("No diseases to load")
            return True, 0
        
        with get_db_context() as db:
            # Check if diseases already exist
            existing_count = db.query(DiseaseTreatment).count()
            if existing_count > 0:
                logger.info(f"Found {existing_count} existing disease records. Skipping insertion.")
                return True, existing_count
            
            # Insert diseases
            inserted = 0
            for disease in diseases:
                try:
                    disease_obj = DiseaseTreatment(**disease)
                    db.add(disease_obj)
                    inserted += 1
                except Exception as e:
                    logger.warning(f"Error inserting disease '{disease.get('disease_name', 'unknown')}': {str(e)}")
                    continue
            
            db.commit()
            logger.info(f"Successfully inserted {inserted} disease records")
            return True, inserted
            
    except Exception as e:
        logger.error(f"Error loading diseases: {str(e)}")
        return False, 0


def load_mandi_prices(data_dir: Path):
    """Load and insert mandi price data"""
    try:
        is_valid, prices, errors = load_and_validate_mandi_prices(data_dir)
        
        if not is_valid:
            logger.error(f"Validation errors: {errors}")
            return False, 0
        
        if not prices:
            logger.warning("No mandi prices to load")
            return True, 0
        
        with get_db_context() as db:
            # Check if prices already exist
            existing_count = db.query(MandiPrice).count()
            if existing_count > 0:
                logger.info(f"Found {existing_count} existing mandi price records. Skipping insertion.")
                return True, existing_count
            
            # Insert prices
            inserted = 0
            for price in prices:
                try:
                    # Convert arrival_date string to datetime if needed
                    if isinstance(price.get("arrival_date"), str):
                        price["arrival_date"] = datetime.fromisoformat(
                            price["arrival_date"].replace("Z", "+00:00")
                        )
                    
                    price_obj = MandiPrice(**price)
                    db.add(price_obj)
                    inserted += 1
                except Exception as e:
                    logger.warning(f"Error inserting price for '{price.get('commodity', 'unknown')}': {str(e)}")
                    continue
            
            db.commit()
            logger.info(f"Successfully inserted {inserted} mandi price records")
            return True, inserted
            
    except Exception as e:
        logger.error(f"Error loading mandi prices: {str(e)}")
        return False, 0


def verify_data():
    """Verify data was inserted correctly"""
    try:
        with get_db_context() as db:
            disease_count = db.query(DiseaseTreatment).count()
            price_count = db.query(MandiPrice).count()
            
            logger.info(f"Data verification:")
            logger.info(f"  - Diseases: {disease_count}")
            logger.info(f"  - Mandi Prices: {price_count}")
            
            # Verify expected counts
            if disease_count < 30:
                logger.warning(f"Expected at least 30 diseases, found {disease_count}")
            
            if price_count < 50:
                logger.warning(f"Expected at least 50 mandi prices, found {price_count}")
            
            # Sample verification - check a few records
            sample_disease = db.query(DiseaseTreatment).first()
            if sample_disease:
                logger.info(f"Sample disease: {sample_disease.disease_name} ({sample_disease.crop_type})")
            
            sample_price = db.query(MandiPrice).first()
            if sample_price:
                logger.info(f"Sample price: {sample_price.commodity} @ {sample_price.price_per_quintal} INR/qnt")
            
            return disease_count, price_count
            
    except Exception as e:
        logger.error(f"Error verifying data: {str(e)}")
        return 0, 0


def main():
    """Main initialization function"""
    logger.info("=" * 60)
    logger.info("Farm Help - Database Initialization")
    logger.info("=" * 60)
    
    # Check database connection
    if not check_db_connection():
        logger.error("Database connection failed. Please check your DATABASE_URL configuration.")
        sys.exit(1)
    
    logger.info("Database connection successful")
    
    # Get data directory
    script_dir = Path(__file__).parent
    data_dir = script_dir / "data"
    
    if not data_dir.exists():
        logger.error(f"Data directory not found: {data_dir}")
        sys.exit(1)
    
    logger.info(f"Using data directory: {data_dir}")
    
    # Step 1: Create tables
    if not create_tables():
        logger.error("Failed to create tables")
        sys.exit(1)
    
    # Step 2: Load diseases
    logger.info("\n" + "-" * 60)
    logger.info("Loading diseases...")
    success, disease_count = load_diseases(data_dir)
    if not success:
        logger.error("Failed to load diseases")
        sys.exit(1)
    
    # Step 3: Load mandi prices
    logger.info("\n" + "-" * 60)
    logger.info("Loading mandi prices...")
    success, price_count = load_mandi_prices(data_dir)
    if not success:
        logger.error("Failed to load mandi prices")
        sys.exit(1)
    
    # Note: Weather alerts are loaded dynamically by the weather service
    # They don't need to be stored in the database
    
    # Step 4: Verify data
    logger.info("\n" + "-" * 60)
    logger.info("Verifying data...")
    final_disease_count, final_price_count = verify_data()
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Initialization Summary")
    logger.info("=" * 60)
    logger.info(f"✓ Database tables created")
    logger.info(f"✓ Diseases loaded: {final_disease_count}")
    logger.info(f"✓ Mandi prices loaded: {final_price_count}")
    logger.info("=" * 60)
    logger.info("Database initialization completed successfully!")
    
    if final_disease_count < 30:
        logger.warning("⚠ Warning: Expected at least 30 diseases")
    
    if final_price_count < 50:
        logger.warning("⚠ Warning: Expected at least 50 mandi prices")


if __name__ == "__main__":
    main()
