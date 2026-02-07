"""
APMC Service - Business Logic

Provides data.gov.in API integration (with fallback to local DB),
price comparison, best APMC recommendation, price trend analysis,
distance calculation, and price analytics.
"""

import logging
import math
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models import MandiPrice

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# data.gov.in API resource ID for daily commodity prices
DATA_GOV_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
API_TIMEOUT_SECONDS = 45.0

# Earth radius in kilometers (WGS-84 mean)
EARTH_RADIUS_KM = 6371.0

# Transport cost estimate: INR per km per quintal
TRANSPORT_COST_PER_KM_PER_QUINTAL = 2.5

# Trend analysis
TREND_STABLE_THRESHOLD_PERCENT = 2.0

# Outlier detection (IQR multiplier)
OUTLIER_IQR_FACTOR = 1.5

# APMC coordinates for distance calculation
APMC_COORDINATES: Dict[str, Dict[str, float]] = {
    "Azadpur Mandi": {"lat": 28.7041, "lon": 77.1788},
    "Khanna Mandi": {"lat": 30.6982, "lon": 76.2212},
    "Kotkapura Mandi": {"lat": 30.5906, "lon": 74.8103},
    "Karnal Mandi": {"lat": 29.6857, "lon": 76.9905},
    "Sonipat Mandi": {"lat": 28.9845, "lon": 77.0151},
    "Aligarh Mandi": {"lat": 27.8974, "lon": 78.0880},
    "Meerut Mandi": {"lat": 28.9845, "lon": 77.7064},
    "Kaithal Mandi": {"lat": 29.8015, "lon": 76.3997},
    "Amritsar Mandi": {"lat": 31.6340, "lon": 74.8723},
    "Ludhiana Mandi": {"lat": 30.9010, "lon": 75.8573},
    "Gorakhpur Mandi": {"lat": 26.7606, "lon": 83.3732},
    "Varanasi Mandi": {"lat": 25.3176, "lon": 82.9739},
    "Rajkot Mandi": {"lat": 22.3039, "lon": 70.8022},
    "Surat Mandi": {"lat": 21.1702, "lon": 72.8311},
    "Ahmedabad Mandi": {"lat": 23.0225, "lon": 72.5714},
    "Yavatmal Mandi": {"lat": 20.3888, "lon": 78.1353},
    "Akola Mandi": {"lat": 20.7002, "lon": 77.0082},
    "Muzaffarnagar Mandi": {"lat": 29.4727, "lon": 77.7085},
    "Bijnor Mandi": {"lat": 29.3723, "lon": 78.1332},
    "Kolhapur Mandi": {"lat": 16.7050, "lon": 74.2433},
    "Pune Mandi": {"lat": 18.5204, "lon": 73.8567},
    "Lasalgaon Mandi": {"lat": 20.0425, "lon": 74.2357},
    "Pimpalgaon Mandi": {"lat": 20.1684, "lon": 73.9984},
    "Ahmednagar Mandi": {"lat": 19.0948, "lon": 74.7480},
    "Nashik Mandi": {"lat": 20.0063, "lon": 73.7900},
    "Agra Mandi": {"lat": 27.1767, "lon": 78.0081},
    "Farrukhabad Mandi": {"lat": 27.3869, "lon": 79.5909},
    "Bathinda Mandi": {"lat": 30.2110, "lon": 74.9455},
    "Moga Mandi": {"lat": 30.8101, "lon": 75.1710},
    "Rohtak Mandi": {"lat": 28.8955, "lon": 76.6066},
    "Hisar Mandi": {"lat": 29.1492, "lon": 75.7217},
    "Kurukshetra Mandi": {"lat": 29.9695, "lon": 76.8783},
    "Jalandhar Mandi": {"lat": 31.3260, "lon": 75.5762},
    "Vadodara Mandi": {"lat": 22.3072, "lon": 73.1812},
    "Wardha Mandi": {"lat": 20.7446, "lon": 78.5984},
    "Saharanpur Mandi": {"lat": 29.9680, "lon": 77.5510},
    "Sangli Mandi": {"lat": 16.8524, "lon": 74.5815},
    "Jalgaon Mandi": {"lat": 21.0077, "lon": 75.5626},
    "Satara Mandi": {"lat": 17.6802, "lon": 74.0183},
    "Kanpur Mandi": {"lat": 26.4499, "lon": 80.3319},
    "Gurgaon Mandi": {"lat": 28.4595, "lon": 77.0266},
    "Fatehgarh Sahib Mandi": {"lat": 30.6518, "lon": 76.3870},
    "Bharuch Mandi": {"lat": 21.6941, "lon": 72.9677},
    "Shamli Mandi": {"lat": 29.4527, "lon": 77.3099},
}


# ---------------------------------------------------------------------------
# In-Memory Cache for data.gov.in API Responses
# ---------------------------------------------------------------------------

class _ApiCache:
    """Thread-safe in-memory cache with TTL for API responses."""

    def __init__(self, ttl_hours: int):
        self._ttl = timedelta(hours=ttl_hours)
        self._store: Dict[str, Tuple[datetime, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            cached_at, data = entry
            if datetime.now(timezone.utc) - cached_at > self._ttl:
                del self._store[key]
                return None
            return data

    def put(self, key: str, data: Any) -> None:
        with self._lock:
            self._store[key] = (datetime.now(timezone.utc), data)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


_api_cache = _ApiCache(ttl_hours=settings.APMC_CACHE_HOURS)


# ---------------------------------------------------------------------------
# Distance Calculation (Haversine)
# ---------------------------------------------------------------------------

def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the great-circle distance between two points
    on Earth using the Haversine formula.

    Returns:
        Distance in kilometers.
    """
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_KM * c


# ---------------------------------------------------------------------------
# data.gov.in API Integration
# ---------------------------------------------------------------------------

def _parse_data_gov_record(record: Dict) -> Optional[Dict]:
    """Parse a single data.gov.in API record into internal format."""
    try:
        date_str = record.get("arrival_date", "")
        arrival_date = None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                arrival_date = datetime.strptime(date_str, fmt).replace(
                    tzinfo=timezone.utc
                )
                break
            except ValueError:
                continue
        if arrival_date is None:
            arrival_date = datetime.now(timezone.utc)

        min_price = float(record.get("min_price", 0) or 0)
        max_price = float(record.get("max_price", 0) or 0)
        modal_price = float(record.get("modal_price", 0) or 0)

        market_raw = record.get("market", "").strip()
        # Normalise: keep the market name as-is from data.gov.in
        # (e.g. "Hardoi APMC", "Bundi APMC")
        market_name = market_raw if market_raw else "Unknown Market"

        return {
            "commodity": record.get("commodity", "").strip(),
            "mandi_name": market_name,
            "state": record.get("state", "").strip(),
            "district": record.get("district", "").strip(),
            "price_per_quintal": modal_price if modal_price > 0 else max_price,
            "arrival_date": arrival_date,
            "min_price": min_price,
            "max_price": max_price,
            "modal_price": modal_price,
        }
    except Exception as exc:
        logger.warning("Failed to parse data.gov.in record: %s", exc)
        return None


async def fetch_from_data_gov(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 100,
) -> Optional[List[Dict]]:
    """
    Fetch commodity prices from the data.gov.in API.

    Returns:
        List of parsed price dicts, or None if the API is unavailable.
    """
    if not settings.DATA_GOV_IN_API_KEY:
        logger.debug(
            "data.gov.in API key not configured; skipping external fetch"
        )
        return None

    cache_key = f"datagov:{commodity or 'all'}:{state or 'all'}"
    cached = _api_cache.get(cache_key)
    if cached is not None:
        logger.info("Serving data.gov.in data from cache (key=%s)", cache_key)
        return cached

    url = f"{settings.DATA_GOV_IN_API_URL}/{DATA_GOV_RESOURCE_ID}"
    params: Dict[str, Any] = {
        "api-key": settings.DATA_GOV_IN_API_KEY,
        "format": "json",
        "limit": limit,
    }
    if commodity:
        params["filters[commodity]"] = commodity
    if state:
        params["filters[state]"] = state

    logger.info(
        "Fetching from data.gov.in | commodity=%s state=%s limit=%d",
        commodity,
        state,
        limit,
    )

    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        raw_records = data.get("records", [])
        parsed = [
            r
            for r in (_parse_data_gov_record(rec) for rec in raw_records)
            if r is not None
        ]

        _api_cache.put(cache_key, parsed)
        logger.info(
            "Fetched %d records from data.gov.in (commodity=%s, state=%s)",
            len(parsed),
            commodity,
            state,
        )
        return parsed
    except httpx.TimeoutException:
        logger.warning("data.gov.in API timed out")
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "data.gov.in HTTP %d: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.warning("data.gov.in API call failed: %s", exc)
    return None


async def refresh_prices_from_api(
    db: Session,
    commodity: Optional[str] = None,
    state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Attempt to refresh mandi prices from data.gov.in and persist to DB.

    Returns:
        Summary dict with source, counts, and message.
    """
    api_records = await fetch_from_data_gov(commodity, state)
    if api_records is None:
        return {
            "source": "local",
            "refreshed": 0,
            "message": "API not available; using local data",
        }

    inserted = 0
    skipped = 0
    for record in api_records:
        existing = (
            db.query(MandiPrice)
            .filter(
                MandiPrice.commodity == record["commodity"],
                MandiPrice.mandi_name == record["mandi_name"],
                MandiPrice.arrival_date == record["arrival_date"],
            )
            .first()
        )
        if existing:
            skipped += 1
            continue
        try:
            db.add(MandiPrice(**record))
            inserted += 1
        except Exception as exc:
            logger.warning("Failed to insert API record: %s", exc)

    if inserted > 0:
        try:
            db.commit()
        except Exception as exc:
            logger.error("Commit failed after API refresh: %s", exc)
            db.rollback()
            return {
                "source": "data.gov.in",
                "refreshed": 0,
                "message": f"Commit failed: {exc}",
            }

    logger.info(
        "API refresh complete: inserted=%d skipped=%d", inserted, skipped
    )
    return {
        "source": "data.gov.in",
        "refreshed": inserted,
        "skipped": skipped,
        "message": (
            f"Inserted {inserted} new records, "
            f"skipped {skipped} duplicates"
        ),
    }


# ---------------------------------------------------------------------------
# API-First Price Fetching
# ---------------------------------------------------------------------------

async def get_prices_from_api(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
) -> Optional[Dict[str, Any]]:
    """
    Fetch prices directly from data.gov.in API.
    
    Always attempts to get live data from the API first.
    Returns None if API is unavailable, allowing caller to fallback.
    
    Args:
        commodity: Filter by commodity name
        state: Filter by state name
        district: Filter by district name
        min_price: Minimum price filter
        max_price: Maximum price filter
        limit: Number of records to return
        offset: Pagination offset
        
    Returns:
        Dict with prices and metadata, or None if API unavailable.
    """
    if not settings.DATA_GOV_IN_API_KEY:
        logger.debug("data.gov.in API key not configured; cannot fetch from API")
        return None
    
    # Request more records from API to account for filtering
    api_limit = min(limit + offset + 200, 500)
    
    api_records = await fetch_from_data_gov(
        commodity=commodity,
        state=state,
        limit=api_limit,
    )
    
    if api_records is None:
        return None
    
    # Apply additional filters that the API doesn't support
    filtered_records = api_records
    
    if district:
        filtered_records = [
            r for r in filtered_records
            if r.get("district", "").lower() == district.lower()
        ]
    
    if min_price is not None:
        filtered_records = [
            r for r in filtered_records
            if r.get("price_per_quintal", 0) >= min_price
        ]
    
    if max_price is not None:
        filtered_records = [
            r for r in filtered_records
            if r.get("price_per_quintal", 0) <= max_price
        ]
    
    # Sort by arrival_date descending, then price descending
    filtered_records.sort(
        key=lambda x: (
            x.get("arrival_date") or datetime.min.replace(tzinfo=timezone.utc),
            x.get("price_per_quintal", 0),
        ),
        reverse=True,
    )
    
    total = len(filtered_records)
    
    # Apply pagination
    paginated = filtered_records[offset:offset + limit]
    
    # Format response
    price_dicts = [
        {
            "id": None,  # API records don't have DB IDs
            "commodity": r.get("commodity", ""),
            "mandi_name": r.get("mandi_name", ""),
            "state": r.get("state", ""),
            "district": r.get("district", ""),
            "price_per_quintal": r.get("price_per_quintal", 0),
            "min_price": r.get("min_price", 0),
            "max_price": r.get("max_price", 0),
            "modal_price": r.get("modal_price", 0),
            "arrival_date": (
                r["arrival_date"].isoformat()
                if isinstance(r.get("arrival_date"), datetime)
                else r.get("arrival_date")
            ),
        }
        for r in paginated
    ]
    
    logger.info(
        "Returning %d prices from data.gov.in API (total=%d, commodity=%s, state=%s)",
        len(price_dicts),
        total,
        commodity,
        state,
    )
    
    return {
        "source": "data.gov.in",
        "total": total,
        "limit": limit,
        "offset": offset,
        "prices": price_dicts,
    }


# ---------------------------------------------------------------------------
# DB Query Functions
# ---------------------------------------------------------------------------

def get_prices(
    db: Session,
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[MandiPrice], int]:
    """
    Query mandi prices with filters and pagination.

    Returns:
        (price_list, total_count)
    """
    query = db.query(MandiPrice)

    if commodity:
        query = query.filter(
            func.lower(MandiPrice.commodity) == commodity.lower()
        )
    if state:
        query = query.filter(
            func.lower(MandiPrice.state) == state.lower()
        )
    if district:
        query = query.filter(
            func.lower(MandiPrice.district) == district.lower()
        )
    if min_price is not None:
        query = query.filter(MandiPrice.price_per_quintal >= min_price)
    if max_price is not None:
        query = query.filter(MandiPrice.price_per_quintal <= max_price)

    total = query.count()
    prices = (
        query.order_by(
            MandiPrice.arrival_date.desc(),
            MandiPrice.price_per_quintal.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )
    return prices, total


def list_commodities(db: Session) -> List[Dict[str, Any]]:
    """
    List all distinct commodities with summary statistics.

    Returns:
        List of dicts with commodity name, record count, avg price, etc.
    """
    rows = (
        db.query(
            MandiPrice.commodity,
            func.count(MandiPrice.id).label("record_count"),
            func.round(func.avg(MandiPrice.price_per_quintal), 2).label(
                "avg_price"
            ),
            func.min(MandiPrice.price_per_quintal).label("min_price"),
            func.max(MandiPrice.price_per_quintal).label("max_price"),
            func.count(func.distinct(MandiPrice.mandi_name)).label(
                "mandi_count"
            ),
            func.count(func.distinct(MandiPrice.state)).label("state_count"),
        )
        .group_by(MandiPrice.commodity)
        .order_by(MandiPrice.commodity)
        .all()
    )

    result = []
    for row in rows:
        result.append(
            {
                "commodity": row.commodity,
                "record_count": row.record_count,
                "avg_price_per_quintal": float(row.avg_price or 0),
                "min_price_per_quintal": float(row.min_price or 0),
                "max_price_per_quintal": float(row.max_price or 0),
                "mandi_count": row.mandi_count,
                "state_count": row.state_count,
            }
        )
    return result


# ---------------------------------------------------------------------------
# Price Comparison
# ---------------------------------------------------------------------------

def compare_prices(
    db: Session,
    commodity: str,
    mandi_names: Optional[List[str]] = None,
    state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare latest prices for a commodity across mandis.

    If mandi_names is provided, only those mandis are compared.
    If state is provided, only mandis in that state are included.
    Otherwise all mandis for the commodity are compared.
    """
    base_query = db.query(MandiPrice).filter(
        func.lower(MandiPrice.commodity) == commodity.lower()
    )
    if state:
        base_query = base_query.filter(
            func.lower(MandiPrice.state) == state.lower()
        )

    # Get distinct mandis
    if mandi_names:
        lower_names = [n.lower().strip() for n in mandi_names]
        mandi_list = (
            base_query.with_entities(MandiPrice.mandi_name)
            .filter(func.lower(MandiPrice.mandi_name).in_(lower_names))
            .distinct()
            .all()
        )
    else:
        mandi_list = (
            base_query.with_entities(MandiPrice.mandi_name).distinct().all()
        )

    results: List[Dict[str, Any]] = []
    for (mandi_name,) in mandi_list:
        latest = (
            db.query(MandiPrice)
            .filter(
                func.lower(MandiPrice.commodity) == commodity.lower(),
                MandiPrice.mandi_name == mandi_name,
            )
            .order_by(MandiPrice.arrival_date.desc())
            .first()
        )
        if not latest:
            continue

        results.append(
            {
                "mandi_name": latest.mandi_name,
                "state": latest.state,
                "district": latest.district,
                "latest_price": latest.price_per_quintal,
                "min_price": latest.min_price,
                "max_price": latest.max_price,
                "modal_price": latest.modal_price,
                "arrival_date": (
                    latest.arrival_date.isoformat()
                    if latest.arrival_date
                    else None
                ),
            }
        )

    if not results:
        return {
            "commodity": commodity,
            "total_apmcs": 0,
            "apmcs": [],
            "analytics": None,
        }

    # Sort by price descending (best for seller first)
    results.sort(key=lambda x: x["latest_price"], reverse=True)

    prices = [r["latest_price"] for r in results]
    analytics = _build_comparison_analytics(prices, results)

    return {
        "commodity": commodity,
        "total_apmcs": len(results),
        "apmcs": results,
        "analytics": analytics,
    }


def _build_comparison_analytics(
    prices: List[float], entries: List[Dict]
) -> Dict[str, Any]:
    """Build analytics summary for a set of compared prices."""
    avg_price = round(sum(prices) / len(prices), 2)
    stats = _calculate_statistics(prices)

    best = entries[0]
    worst = entries[-1]
    spread = round(best["latest_price"] - worst["latest_price"], 2)
    spread_pct = (
        round((spread / worst["latest_price"]) * 100, 2)
        if worst["latest_price"] > 0
        else 0
    )

    return {
        "average_price": avg_price,
        "price_range": {"min": min(prices), "max": max(prices)},
        "price_spread": spread,
        "price_spread_percent": spread_pct,
        "best_apmc": best["mandi_name"],
        "worst_apmc": worst["mandi_name"],
        "statistics": stats,
    }


# ---------------------------------------------------------------------------
# Best APMC Recommendation
# ---------------------------------------------------------------------------

def find_best_apmc(
    db: Session,
    commodity: str,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    max_distance_km: float = 100.0,
    state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Find the best APMC for selling a commodity, considering price and
    optional distance/transport cost.

    APMCs are scored by net_price = market_price - transport_cost.
    """
    base_query = db.query(MandiPrice).filter(
        func.lower(MandiPrice.commodity) == commodity.lower()
    )
    if state:
        base_query = base_query.filter(
            func.lower(MandiPrice.state) == state.lower()
        )

    distinct_mandis = (
        base_query.with_entities(MandiPrice.mandi_name).distinct().all()
    )

    recommendations: List[Dict[str, Any]] = []

    for (mandi_name,) in distinct_mandis:
        latest = (
            db.query(MandiPrice)
            .filter(
                func.lower(MandiPrice.commodity) == commodity.lower(),
                MandiPrice.mandi_name == mandi_name,
            )
            .order_by(MandiPrice.arrival_date.desc())
            .first()
        )
        if not latest:
            continue

        distance_km: Optional[float] = None
        transport_cost = 0.0
        apmc_coord = APMC_COORDINATES.get(mandi_name)

        if user_lat is not None and user_lon is not None:
            if apmc_coord:
                distance_km = round(
                    haversine_distance(
                        user_lat,
                        user_lon,
                        apmc_coord["lat"],
                        apmc_coord["lon"],
                    ),
                    1,
                )
                if distance_km > max_distance_km:
                    continue
                transport_cost = round(
                    distance_km * TRANSPORT_COST_PER_KM_PER_QUINTAL, 2
                )
            else:
                # No coordinates for this APMC; skip when distance
                # filtering is active to avoid unfair ranking.
                continue

        net_price = round(latest.price_per_quintal - transport_cost, 2)

        recommendations.append(
            {
                "mandi_name": latest.mandi_name,
                "state": latest.state,
                "district": latest.district,
                "latest_price": latest.price_per_quintal,
                "min_price": latest.min_price,
                "max_price": latest.max_price,
                "modal_price": latest.modal_price,
                "distance_km": distance_km,
                "transport_cost_per_quintal": transport_cost,
                "net_price_per_quintal": net_price,
                "arrival_date": (
                    latest.arrival_date.isoformat()
                    if latest.arrival_date
                    else None
                ),
            }
        )

    # Sort by net price descending (best for farmer first)
    recommendations.sort(
        key=lambda x: x["net_price_per_quintal"], reverse=True
    )
    for i, rec in enumerate(recommendations, start=1):
        rec["rank"] = i

    return {
        "commodity": commodity,
        "user_location": (
            {"latitude": user_lat, "longitude": user_lon}
            if user_lat is not None and user_lon is not None
            else None
        ),
        "max_distance_km": (
            max_distance_km
            if user_lat is not None and user_lon is not None
            else None
        ),
        "total_apmcs": len(recommendations),
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# Price Trend Analysis
# ---------------------------------------------------------------------------

def get_price_trends(
    db: Session,
    commodity: str,
    state: Optional[str] = None,
    days: int = 7,
) -> Dict[str, Any]:
    """
    Analyze price trends for a commodity over the specified period.

    Falls back to all available data when no records exist within
    the requested window.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    query = db.query(MandiPrice).filter(
        func.lower(MandiPrice.commodity) == commodity.lower()
    )
    if state:
        query = query.filter(
            func.lower(MandiPrice.state) == state.lower()
        )

    # Try requested window first; fall back to all data
    windowed = query.filter(MandiPrice.arrival_date >= cutoff)
    prices = windowed.order_by(MandiPrice.arrival_date.asc()).all()

    using_full_range = False
    if not prices:
        prices = query.order_by(MandiPrice.arrival_date.asc()).all()
        using_full_range = True

    if not prices:
        return {
            "commodity": commodity,
            "state": state,
            "period_days": days,
            "data_points": 0,
            "message": "No price data found for this commodity",
        }

    # Group by date
    daily: Dict[str, List[float]] = {}
    for p in prices:
        key = (
            p.arrival_date.strftime("%Y-%m-%d")
            if p.arrival_date
            else "unknown"
        )
        daily.setdefault(key, []).append(p.price_per_quintal)

    price_history = []
    for date_str in sorted(daily.keys()):
        day_prices = daily[date_str]
        price_history.append(
            {
                "date": date_str,
                "avg_price": round(sum(day_prices) / len(day_prices), 2),
                "min_price": round(min(day_prices), 2),
                "max_price": round(max(day_prices), 2),
                "records": len(day_prices),
            }
        )

    # Trend determination via split-period comparison
    trend = "insufficient_data"
    change_pct = 0.0
    if len(price_history) >= 2:
        mid = len(price_history) // 2
        first_avg = sum(p["avg_price"] for p in price_history[:mid]) / mid
        second_avg = (
            sum(p["avg_price"] for p in price_history[mid:])
            / (len(price_history) - mid)
        )
        if first_avg > 0:
            change_pct = round(
                ((second_avg - first_avg) / first_avg) * 100, 2
            )
        trend = _classify_trend(change_pct)

    all_prices = [p.price_per_quintal for p in prices]
    stats = _calculate_statistics(all_prices)
    outliers = _detect_outliers(all_prices, prices)

    # Identify highest / lowest mandis
    highest = max(prices, key=lambda p: p.price_per_quintal)
    lowest = min(prices, key=lambda p: p.price_per_quintal)

    return {
        "commodity": commodity,
        "state": state,
        "period_days": days,
        "using_full_range": using_full_range,
        "data_points": len(prices),
        "unique_dates": len(daily),
        "trend": trend,
        "change_percent": change_pct,
        "statistics": stats,
        "price_history": price_history,
        "highest_price_mandi": {
            "mandi_name": highest.mandi_name,
            "state": highest.state,
            "price": highest.price_per_quintal,
            "date": (
                highest.arrival_date.isoformat()
                if highest.arrival_date
                else None
            ),
        },
        "lowest_price_mandi": {
            "mandi_name": lowest.mandi_name,
            "state": lowest.state,
            "price": lowest.price_per_quintal,
            "date": (
                lowest.arrival_date.isoformat()
                if lowest.arrival_date
                else None
            ),
        },
        "outliers": outliers,
    }


# ---------------------------------------------------------------------------
# Analytics Helpers
# ---------------------------------------------------------------------------

def _calculate_statistics(values: List[float]) -> Dict[str, Any]:
    """Calculate descriptive statistics for a list of prices."""
    if not values:
        return {}

    n = len(values)
    mean = sum(values) / n
    sorted_vals = sorted(values)
    median = (
        sorted_vals[n // 2]
        if n % 2 == 1
        else (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2
    )

    variance = sum((x - mean) ** 2 for x in values) / n if n > 1 else 0
    std_dev = math.sqrt(variance)
    cv = (std_dev / mean * 100) if mean > 0 else 0

    return {
        "count": n,
        "mean": round(mean, 2),
        "median": round(median, 2),
        "min": round(min(values), 2),
        "max": round(max(values), 2),
        "std_dev": round(std_dev, 2),
        "coefficient_of_variation": round(cv, 2),
    }


def _detect_outliers(
    values: List[float],
    price_records: Optional[List[MandiPrice]] = None,
) -> List[Dict[str, Any]]:
    """
    Detect price outliers using the IQR method.

    Returns:
        List of outlier dicts with value and classification.
    """
    if len(values) < 4:
        return []

    sorted_vals = sorted(values)
    n = len(sorted_vals)
    q1 = sorted_vals[n // 4]
    q3 = sorted_vals[(3 * n) // 4]
    iqr = q3 - q1
    lower_fence = q1 - OUTLIER_IQR_FACTOR * iqr
    upper_fence = q3 + OUTLIER_IQR_FACTOR * iqr

    outliers: List[Dict[str, Any]] = []
    records = price_records or []

    for i, val in enumerate(values):
        if val < lower_fence or val > upper_fence:
            entry: Dict[str, Any] = {
                "price": round(val, 2),
                "type": "low" if val < lower_fence else "high",
            }
            if i < len(records):
                rec = records[i]
                entry["mandi_name"] = rec.mandi_name
                entry["state"] = rec.state
            outliers.append(entry)

    return outliers


def _classify_trend(change_pct: float) -> str:
    """Classify a percentage change as up, down, or stable."""
    if change_pct > TREND_STABLE_THRESHOLD_PERCENT:
        return "up"
    if change_pct < -TREND_STABLE_THRESHOLD_PERCENT:
        return "down"
    return "stable"


# ---------------------------------------------------------------------------
# Sell Advisory - Storage vs Immediate Sell & Best Time to Sell
# ---------------------------------------------------------------------------

# Storage cost estimates (INR per quintal per month)
STORAGE_COST_PER_QUINTAL_PER_MONTH = {
    "default": 50,
    "perishable": 150,  # Cold storage required
    "semi_perishable": 80,
}

# Commodity classification for storage
COMMODITY_STORAGE_CLASS = {
    # Perishable (require cold storage, short shelf life)
    "Tomato": "perishable",
    "Onion": "semi_perishable",
    "Potato": "semi_perishable",
    "Brinjal": "perishable",
    "Cabbage": "perishable",
    "Cauliflower": "perishable",
    "Capsicum": "perishable",
    "Cucumber": "perishable",
    "Carrot": "perishable",
    "Green Chilli": "perishable",
    "Lady Finger": "perishable",
    "Bitter Gourd": "perishable",
    "Bottle Gourd": "perishable",
    "Pumpkin": "semi_perishable",
    "Banana": "perishable",
    "Mango": "perishable",
    "Papaya": "perishable",
    "Guava": "perishable",
    "Grapes": "perishable",
    "Pomegranate": "semi_perishable",
    "Apple": "semi_perishable",
    "Orange": "semi_perishable",
    # Non-perishable (can be stored longer)
    "Wheat": "default",
    "Rice": "default",
    "Paddy": "default",
    "Maize": "default",
    "Bajra": "default",
    "Jowar": "default",
    "Cotton": "default",
    "Groundnut": "default",
    "Soyabean": "default",
    "Mustard": "default",
    "Chana": "default",
    "Tur": "default",
    "Moong": "default",
    "Urad": "default",
    "Masoor": "default",
    "Cumin": "default",
    "Coriander": "default",
    "Turmeric": "default",
    "Red Chilli": "default",
    "Ginger": "semi_perishable",
    "Garlic": "semi_perishable",
    "Sugarcane": "perishable",
}

# Seasonal price patterns (month -> expected price movement)
# Based on typical harvest cycles in India
SEASONAL_PATTERNS = {
    "Wheat": {
        "peak_months": [5, 6, 7, 8],  # May-Aug (post-harvest low, prices rise)
        "low_months": [3, 4],  # Mar-Apr (harvest time, prices low)
        "expected_rise_pct": 15,
    },
    "Rice": {
        "peak_months": [7, 8, 9],  # Jul-Sep (lean season)
        "low_months": [11, 12, 1],  # Nov-Jan (harvest time)
        "expected_rise_pct": 12,
    },
    "Paddy": {
        "peak_months": [7, 8, 9],
        "low_months": [10, 11, 12],
        "expected_rise_pct": 12,
    },
    "Cotton": {
        "peak_months": [6, 7, 8, 9],  # Before new crop
        "low_months": [11, 12, 1, 2],  # Harvest season
        "expected_rise_pct": 20,
    },
    "Groundnut": {
        "peak_months": [6, 7, 8],
        "low_months": [10, 11, 12],
        "expected_rise_pct": 18,
    },
    "Onion": {
        "peak_months": [8, 9, 10],  # Before Kharif harvest
        "low_months": [1, 2, 3, 4, 5],  # Rabi harvest
        "expected_rise_pct": 40,
    },
    "Potato": {
        "peak_months": [8, 9, 10, 11],
        "low_months": [1, 2, 3],
        "expected_rise_pct": 30,
    },
    "Tomato": {
        "peak_months": [5, 6, 7],  # Summer shortage
        "low_months": [11, 12, 1, 2],  # Winter glut
        "expected_rise_pct": 50,
    },
    "Soyabean": {
        "peak_months": [6, 7, 8],
        "low_months": [10, 11, 12],
        "expected_rise_pct": 15,
    },
    "Maize": {
        "peak_months": [4, 5, 6],
        "low_months": [9, 10, 11],
        "expected_rise_pct": 12,
    },
    "Chana": {
        "peak_months": [10, 11, 12],
        "low_months": [3, 4, 5],
        "expected_rise_pct": 18,
    },
}


def get_sell_advisory(
    db: Session,
    commodity: str,
    current_price: Optional[float] = None,
    state: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate storage vs immediate sell recommendation and best time to sell.

    Considers:
    - Current price vs historical average
    - Price trend (rising/falling)
    - Storage costs for the commodity
    - Seasonal price patterns
    - Perishability of the commodity

    Returns:
        Advisory with recommendation, reasoning, and best selling window.
    """
    # Get historical trend data
    trend_data = get_price_trends(db, commodity, state, days=30)

    if trend_data.get("data_points", 0) < 3:
        return {
            "commodity": commodity,
            "has_data": False,
            "message": "Insufficient price data to generate recommendation",
            "recommendation": None,
            "best_time_to_sell": None,
        }

    stats = trend_data.get("statistics", {})
    trend = trend_data.get("trend", "stable")
    change_pct = trend_data.get("change_percent", 0)
    price_history = trend_data.get("price_history", [])

    # Get current price (use latest from history if not provided)
    if current_price is None and price_history:
        current_price = price_history[-1].get("avg_price", 0)

    historical_avg = stats.get("mean", current_price)
    historical_max = stats.get("max", current_price)
    historical_min = stats.get("min", current_price)

    # Get commodity storage class
    storage_class = COMMODITY_STORAGE_CLASS.get(commodity, "default")
    storage_cost = STORAGE_COST_PER_QUINTAL_PER_MONTH.get(storage_class, 50)

    # Get seasonal pattern if available
    seasonal = SEASONAL_PATTERNS.get(commodity, {})
    current_month = datetime.now().month

    # Calculate price position (0-100 scale)
    price_range = historical_max - historical_min
    if price_range > 0:
        price_position = ((current_price - historical_min) / price_range) * 100
    else:
        price_position = 50

    # Decision factors
    factors = []
    sell_score = 50  # Start neutral

    # Factor 1: Current price vs historical average
    price_vs_avg_pct = ((current_price - historical_avg) / historical_avg * 100) if historical_avg > 0 else 0

    if price_vs_avg_pct > 15:
        factors.append({
            "factor": "Price above average",
            "impact": "positive",
            "detail": f"Current price is {price_vs_avg_pct:.1f}% above 30-day average",
        })
        sell_score += 20
    elif price_vs_avg_pct > 5:
        factors.append({
            "factor": "Price slightly above average",
            "impact": "neutral",
            "detail": f"Current price is {price_vs_avg_pct:.1f}% above 30-day average",
        })
        sell_score += 10
    elif price_vs_avg_pct < -15:
        factors.append({
            "factor": "Price below average",
            "impact": "negative",
            "detail": f"Current price is {abs(price_vs_avg_pct):.1f}% below 30-day average",
        })
        sell_score -= 20
    elif price_vs_avg_pct < -5:
        factors.append({
            "factor": "Price slightly below average",
            "impact": "neutral",
            "detail": f"Current price is {abs(price_vs_avg_pct):.1f}% below 30-day average",
        })
        sell_score -= 10

    # Factor 2: Price trend
    if trend == "up":
        factors.append({
            "factor": "Rising price trend",
            "impact": "negative",  # negative for selling now
            "detail": f"Prices have risen {change_pct:.1f}% recently - may continue rising",
        })
        sell_score -= 15
    elif trend == "down":
        factors.append({
            "factor": "Falling price trend",
            "impact": "positive",  # positive for selling now
            "detail": f"Prices have fallen {abs(change_pct):.1f}% recently - sell before further drop",
        })
        sell_score += 15

    # Factor 3: Perishability
    if storage_class == "perishable":
        factors.append({
            "factor": "Highly perishable commodity",
            "impact": "positive",
            "detail": "Short shelf life - immediate sale recommended to avoid spoilage",
        })
        sell_score += 25
    elif storage_class == "semi_perishable":
        factors.append({
            "factor": "Semi-perishable commodity",
            "impact": "neutral",
            "detail": "Can be stored for 1-3 months with proper storage",
        })
        sell_score += 10

    # Factor 4: Seasonal patterns
    if seasonal:
        peak_months = seasonal.get("peak_months", [])
        low_months = seasonal.get("low_months", [])
        expected_rise = seasonal.get("expected_rise_pct", 10)

        if current_month in peak_months:
            factors.append({
                "factor": "Peak price season",
                "impact": "positive",
                "detail": "Current month is typically a high-price period for this commodity",
            })
            sell_score += 20
        elif current_month in low_months:
            factors.append({
                "factor": "Low price season",
                "impact": "negative",
                "detail": f"Prices typically rise {expected_rise}% in coming months",
            })
            sell_score -= 20

    # Factor 5: Storage cost consideration
    months_to_peak = 0
    if seasonal.get("peak_months"):
        peak_months = seasonal["peak_months"]
        for m in range(1, 7):  # Look up to 6 months ahead
            future_month = (current_month + m - 1) % 12 + 1
            if future_month in peak_months:
                months_to_peak = m
                break

    if months_to_peak > 0 and storage_class != "perishable":
        potential_gain = (seasonal.get("expected_rise_pct", 10) / 100) * current_price
        storage_total = storage_cost * months_to_peak
        net_gain = potential_gain - storage_total

        if net_gain > 0:
            factors.append({
                "factor": "Storage economics favorable",
                "impact": "negative",
                "detail": f"Potential net gain of Rs {net_gain:.0f}/qtl after {months_to_peak} months storage",
            })
            sell_score -= 15
        else:
            factors.append({
                "factor": "Storage not economical",
                "impact": "positive",
                "detail": f"Storage costs exceed potential price gains",
            })
            sell_score += 10

    # Generate recommendation
    if sell_score >= 70:
        recommendation = "SELL_NOW"
        recommendation_text = "Sell immediately"
        confidence = min(95, sell_score)
        reasoning = "Current conditions strongly favor immediate sale"
    elif sell_score >= 55:
        recommendation = "SELL_SOON"
        recommendation_text = "Sell within 1-2 weeks"
        confidence = min(80, sell_score)
        reasoning = "Conditions moderately favor selling soon"
    elif sell_score <= 30:
        recommendation = "STORE"
        recommendation_text = "Store for better prices"
        confidence = min(90, 100 - sell_score)
        reasoning = "Storing the crop may yield better returns"
    elif sell_score <= 45:
        recommendation = "WAIT"
        recommendation_text = "Wait and monitor prices"
        confidence = min(75, 100 - sell_score)
        reasoning = "Current prices are not optimal - consider waiting"
    else:
        recommendation = "FLEXIBLE"
        recommendation_text = "Sell partially or wait"
        confidence = 60
        reasoning = "Mixed signals - consider selling part of stock"

    # Best time to sell calculation
    best_time = _calculate_best_selling_window(
        commodity, current_month, seasonal, storage_class, price_history
    )

    return {
        "commodity": commodity,
        "has_data": True,
        "current_price": round(current_price, 2) if current_price else None,
        "historical_avg": round(historical_avg, 2),
        "historical_max": round(historical_max, 2),
        "historical_min": round(historical_min, 2),
        "price_position_percentile": round(price_position, 1),
        "trend": trend,
        "trend_change_pct": change_pct,
        "storage_class": storage_class,
        "storage_cost_per_month": storage_cost,
        "recommendation": {
            "action": recommendation,
            "text": recommendation_text,
            "confidence": confidence,
            "reasoning": reasoning,
        },
        "factors": factors,
        "best_time_to_sell": best_time,
    }


def _calculate_best_selling_window(
    commodity: str,
    current_month: int,
    seasonal: Dict[str, Any],
    storage_class: str,
    price_history: List[Dict],
) -> Dict[str, Any]:
    """Calculate the best time window to sell the commodity."""

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    # Default: sell now for perishables
    if storage_class == "perishable":
        return {
            "window": "Immediate",
            "start_month": month_names[current_month - 1],
            "end_month": month_names[current_month - 1],
            "months_to_wait": 0,
            "confidence": 85,
            "reason": "Perishable commodity - sell before quality degrades",
        }

    # Check seasonal patterns
    if seasonal:
        peak_months = seasonal.get("peak_months", [])
        expected_rise = seasonal.get("expected_rise_pct", 10)

        if current_month in peak_months:
            return {
                "window": "Now - Peak Season",
                "start_month": month_names[current_month - 1],
                "end_month": month_names[peak_months[-1] - 1],
                "months_to_wait": 0,
                "confidence": 80,
                "reason": "Currently in peak price season - sell within this window",
            }

        # Find next peak month
        months_ahead = []
        for pm in peak_months:
            diff = pm - current_month
            if diff <= 0:
                diff += 12
            months_ahead.append((pm, diff))

        if months_ahead:
            months_ahead.sort(key=lambda x: x[1])
            next_peak, months_to_wait = months_ahead[0]
            peak_start = peak_months[0]
            peak_end = peak_months[-1]

            # Adjust for semi-perishables
            if storage_class == "semi_perishable" and months_to_wait > 3:
                return {
                    "window": "Within 1-2 months",
                    "start_month": month_names[current_month - 1],
                    "end_month": month_names[(current_month + 1) % 12],
                    "months_to_wait": 0,
                    "confidence": 70,
                    "reason": "Semi-perishable - sell before storage losses exceed gains",
                }

            return {
                "window": f"{month_names[peak_start - 1]} - {month_names[peak_end - 1]}",
                "start_month": month_names[peak_start - 1],
                "end_month": month_names[peak_end - 1],
                "months_to_wait": months_to_wait,
                "expected_price_rise_pct": expected_rise,
                "confidence": 75,
                "reason": f"Historical peak season - prices typically {expected_rise}% higher",
            }

    # Analyze recent price history for trend-based recommendation
    if len(price_history) >= 5:
        recent_prices = [p["avg_price"] for p in price_history[-5:]]
        if all(recent_prices[i] <= recent_prices[i + 1] for i in range(len(recent_prices) - 1)):
            return {
                "window": "Wait 2-4 weeks",
                "start_month": month_names[current_month - 1],
                "end_month": month_names[(current_month) % 12],
                "months_to_wait": 1,
                "confidence": 65,
                "reason": "Prices showing consistent upward trend",
            }
        elif all(recent_prices[i] >= recent_prices[i + 1] for i in range(len(recent_prices) - 1)):
            return {
                "window": "Immediate",
                "start_month": month_names[current_month - 1],
                "end_month": month_names[current_month - 1],
                "months_to_wait": 0,
                "confidence": 70,
                "reason": "Prices showing consistent downward trend - sell before further drop",
            }

    # Default recommendation
    return {
        "window": "Flexible",
        "start_month": month_names[current_month - 1],
        "end_month": month_names[(current_month + 2) % 12],
        "months_to_wait": 0,
        "confidence": 50,
        "reason": "No strong seasonal pattern - monitor market conditions",
    }
