"""
Script to populate government schemes database from JSON file.

Run this script to load all government schemes data into the database.
"""

import json
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import GovernmentScheme

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_schemes_from_json(json_path: str) -> list:
    """Load schemes data from JSON file."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('schemes', [])
    except FileNotFoundError:
        logger.error(f"JSON file not found: {json_path}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON: {e}")
        return []


def populate_schemes(db: Session, schemes_data: list):
    """Populate schemes table with data."""
    added_count = 0
    updated_count = 0
    
    for scheme_data in schemes_data:
        try:
            # Check if scheme already exists
            existing_scheme = db.query(GovernmentScheme).filter(
                GovernmentScheme.scheme_code == scheme_data['scheme_code']
            ).first()
            
            # Convert lists and dicts to JSON strings
            applicable_states_json = json.dumps(scheme_data.get('applicable_states', []))
            eligibility_json = json.dumps(scheme_data.get('eligibility_criteria', {}))
            documents_json = json.dumps(scheme_data.get('required_documents', []))
            features_json = json.dumps(scheme_data.get('key_features', []))
            
            if existing_scheme:
                # Update existing scheme
                existing_scheme.scheme_name = scheme_data['scheme_name']
                existing_scheme.scheme_name_hindi = scheme_data.get('scheme_name_hindi')
                existing_scheme.scheme_type = scheme_data['scheme_type']
                existing_scheme.state_specific = 1 if scheme_data.get('state_specific', False) else 0
                existing_scheme.applicable_states = applicable_states_json
                existing_scheme.description = scheme_data['description']
                existing_scheme.description_hindi = scheme_data.get('description_hindi')
                existing_scheme.benefit_amount = scheme_data.get('benefit_amount')
                existing_scheme.eligibility_criteria = eligibility_json
                existing_scheme.required_documents = documents_json
                existing_scheme.application_process = scheme_data.get('application_process')
                existing_scheme.application_url = scheme_data.get('application_url')
                existing_scheme.helpline_number = scheme_data.get('helpline_number')
                existing_scheme.deadline_type = scheme_data.get('deadline_type')
                existing_scheme.deadline_date = scheme_data.get('deadline_date')
                existing_scheme.key_features = features_json
                existing_scheme.is_active = 1 if scheme_data.get('is_active', True) else 0
                existing_scheme.last_updated = scheme_data.get('last_updated')
                
                updated_count += 1
                logger.info(f"Updated scheme: {scheme_data['scheme_name']}")
            else:
                # Create new scheme
                new_scheme = GovernmentScheme(
                    scheme_code=scheme_data['scheme_code'],
                    scheme_name=scheme_data['scheme_name'],
                    scheme_name_hindi=scheme_data.get('scheme_name_hindi'),
                    scheme_type=scheme_data['scheme_type'],
                    state_specific=1 if scheme_data.get('state_specific', False) else 0,
                    applicable_states=applicable_states_json,
                    description=scheme_data['description'],
                    description_hindi=scheme_data.get('description_hindi'),
                    benefit_amount=scheme_data.get('benefit_amount'),
                    eligibility_criteria=eligibility_json,
                    required_documents=documents_json,
                    application_process=scheme_data.get('application_process'),
                    application_url=scheme_data.get('application_url'),
                    helpline_number=scheme_data.get('helpline_number'),
                    deadline_type=scheme_data.get('deadline_type'),
                    deadline_date=scheme_data.get('deadline_date'),
                    key_features=features_json,
                    is_active=1 if scheme_data.get('is_active', True) else 0,
                    last_updated=scheme_data.get('last_updated')
                )
                db.add(new_scheme)
                added_count += 1
                logger.info(f"Added scheme: {scheme_data['scheme_name']}")
            
        except Exception as e:
            logger.error(f"Error processing scheme {scheme_data.get('scheme_code', 'UNKNOWN')}: {e}")
            continue
    
    try:
        db.commit()
        logger.info(f"Successfully committed {added_count} new schemes and {updated_count} updates")
    except Exception as e:
        db.rollback()
        logger.error(f"Error committing to database: {e}")
        raise


def main():
    """Main function to populate schemes."""
    logger.info("Starting schemes population script...")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Get JSON file path
    json_path = Path(__file__).parent.parent.parent / "data" / "schemes.json"
    logger.info(f"Loading schemes from: {json_path}")
    
    # Load schemes data
    schemes_data = load_schemes_from_json(str(json_path))
    
    if not schemes_data:
        logger.error("No schemes data loaded. Exiting.")
        return
    
    logger.info(f"Loaded {len(schemes_data)} schemes from JSON")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Populate schemes
        populate_schemes(db, schemes_data)
        logger.info("Schemes population completed successfully!")
        
        # Display summary
        total_schemes = db.query(GovernmentScheme).count()
        active_schemes = db.query(GovernmentScheme).filter(GovernmentScheme.is_active == 1).count()
        national_schemes = db.query(GovernmentScheme).filter(GovernmentScheme.state_specific == 0).count()
        state_schemes = db.query(GovernmentScheme).filter(GovernmentScheme.state_specific == 1).count()
        
        logger.info(f"\nDatabase Summary:")
        logger.info(f"  Total schemes: {total_schemes}")
        logger.info(f"  Active schemes: {active_schemes}")
        logger.info(f"  National schemes: {national_schemes}")
        logger.info(f"  State-specific schemes: {state_schemes}")
        
    except Exception as e:
        logger.error(f"Error during population: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
