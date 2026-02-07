"""
Database Configuration and Session Management
"""

import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, event, exc
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool
from sqlalchemy.engine import Engine
from app.config import settings

logger = logging.getLogger(__name__)

# Determine pool class based on database type
# SQLite doesn't support connection pooling, use NullPool
if settings.DATABASE_URL.startswith("sqlite"):
    poolclass = NullPool
    connect_args = {"check_same_thread": False}
    pool_pre_ping = False
else:
    poolclass = QueuePool
    connect_args = {}
    pool_pre_ping = True

# Build engine kwargs; NullPool does not accept pool_size/max_overflow/pool_timeout
_engine_kwargs: dict = dict(
    poolclass=poolclass,
    pool_pre_ping=pool_pre_ping,
    echo=settings.DEBUG,
    connect_args=connect_args,
)

if poolclass is not NullPool:
    _engine_kwargs.update(
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_timeout=30,
    )

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

Base = declarative_base()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """
    Set SQLite pragmas for better performance and foreign key support
    """
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


@event.listens_for(Engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """
    Log connection checkout events
    """
    if settings.DEBUG:
        logger.debug("Connection checked out from pool")


def get_db():
    """
    Database session dependency for FastAPI
    
    Yields:
        Session: SQLAlchemy database session
        
    Example:
        ```python
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
        ```
    """
    db = SessionLocal()
    try:
        yield db
    except exc.SQLAlchemyError as e:
        logger.error(f"Database error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database sessions (for use outside FastAPI)
    
    Yields:
        Session: SQLAlchemy database session
        
    Example:
        ```python
        with get_db_context() as db:
            items = db.query(Item).all()
        ```
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except exc.SQLAlchemyError as e:
        logger.error(f"Database error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise


def check_db_connection() -> bool:
    """
    Check if database connection is healthy
    
    Returns:
        bool: True if connection is healthy, False otherwise
    """
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False
