"""
APMC Price API Routes

Endpoints for commodity price lookup, comparison, best APMC
recommendation, trend analysis, and commodity listing.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.services import apmc_service

router = APIRouter(prefix="/apmc", tags=["APMC"])


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------

@router.get("/health")
async def apmc_health():
    """APMC API health check."""
    return {"status": "healthy", "service": "APMC API"}


# --------------------------------------------------------------------------
# GET /api/apmc/commodities
# --------------------------------------------------------------------------

@router.get(
    "/commodities",
    summary="List all available commodities",
    description=(
        "Returns every distinct commodity in the database together "
        "with summary statistics (avg/min/max price, APMC count)."
    ),
)
async def get_commodities(db: Session = Depends(get_db)):
    """List all commodities with summary statistics."""
    try:
        commodities = apmc_service.list_commodities(db)
        return {
            "total": len(commodities),
            "commodities": commodities,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list commodities: {exc}",
        )


# --------------------------------------------------------------------------
# GET /api/apmc/prices
# --------------------------------------------------------------------------

@router.get(
    "/prices",
    summary="Get APMC prices by commodity",
    description=(
        "Query APMC prices with optional filters on commodity, state, "
        "district, and price range. Supports pagination. "
        "When a data.gov.in API key is configured the endpoint attempts "
        "an automatic background refresh before querying."
    ),
)
async def get_prices(
    commodity: Optional[str] = Query(
        None, max_length=100, description="Commodity name (e.g. Wheat, Rice)"
    ),
    state: Optional[str] = Query(
        None, max_length=100, description="State name"
    ),
    district: Optional[str] = Query(
        None, max_length=100, description="District name"
    ),
    min_price: Optional[float] = Query(
        None, ge=0, description="Minimum price per quintal"
    ),
    max_price: Optional[float] = Query(
        None, ge=0, description="Maximum price per quintal"
    ),
    limit: int = Query(50, ge=1, le=200, description="Page size"),
    offset: int = Query(0, ge=0, description="Page offset"),
    refresh: bool = Query(
        False,
        description=(
            "If true, attempt to refresh data from data.gov.in before querying"
        ),
    ),
    db: Session = Depends(get_db),
):
    """Get APMC prices filtered by commodity / state / district."""
    try:
        refresh_info = None
        if refresh:
            refresh_info = await apmc_service.refresh_prices_from_api(
                db, commodity=commodity, state=state
            )

        prices, total = apmc_service.get_prices(
            db,
            commodity=commodity,
            state=state,
            district=district,
            min_price=min_price,
            max_price=max_price,
            limit=limit,
            offset=offset,
        )

        price_dicts = [
            {
                "id": p.id,
                "commodity": p.commodity,
                "mandi_name": p.mandi_name,
                "state": p.state,
                "district": p.district,
                "price_per_quintal": p.price_per_quintal,
                "min_price": p.min_price,
                "max_price": p.max_price,
                "modal_price": p.modal_price,
                "arrival_date": (
                    p.arrival_date.isoformat() if p.arrival_date else None
                ),
            }
            for p in prices
        ]

        response: dict = {
            "total": total,
            "limit": limit,
            "offset": offset,
            "prices": price_dicts,
        }
        if refresh_info is not None:
            response["refresh_info"] = refresh_info
        return response

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch APMC prices: {exc}",
        )


# --------------------------------------------------------------------------
# GET /api/apmc/compare
# --------------------------------------------------------------------------

@router.get(
    "/compare",
    summary="Compare prices across APMCs",
    description=(
        "Compare latest prices for a commodity across specified APMCs. "
        "Returns analytics (spread, best/worst APMC, statistics). "
        "If no APMC names are given, all APMCs for the commodity are compared."
    ),
)
async def compare_prices(
    commodity: str = Query(
        ..., min_length=1, max_length=100, description="Commodity name"
    ),
    apmcs: Optional[str] = Query(
        None,
        description="Comma-separated APMC names (optional; all if omitted)",
    ),
    state: Optional[str] = Query(
        None, max_length=100, description="State filter"
    ),
    db: Session = Depends(get_db),
):
    """Compare prices for a commodity across APMCs."""
    try:
        apmc_names = (
            [n.strip() for n in apmcs.split(",") if n.strip()]
            if apmcs
            else None
        )
        result = apmc_service.compare_prices(
            db, commodity=commodity, mandi_names=apmc_names, state=state
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare prices: {exc}",
        )


# --------------------------------------------------------------------------
# GET /api/apmc/best
# --------------------------------------------------------------------------

@router.get(
    "/best",
    summary="Get best APMC recommendation",
    description=(
        "Finds the best APMC for selling a commodity. "
        "When latitude/longitude are provided, factors in transport cost "
        "to compute a net price per quintal. Results are ranked by net price."
    ),
)
async def get_best_apmc(
    commodity: str = Query(
        ..., min_length=1, max_length=100, description="Commodity name"
    ),
    latitude: Optional[float] = Query(
        None, ge=-90, le=90, description="Farmer latitude"
    ),
    longitude: Optional[float] = Query(
        None, ge=-180, le=180, description="Farmer longitude"
    ),
    max_distance_km: float = Query(
        100, ge=1, le=2000, description="Maximum radius in km"
    ),
    state: Optional[str] = Query(
        None, max_length=100, description="State filter"
    ),
    db: Session = Depends(get_db),
):
    """Get best APMC recommendation based on price and distance."""
    try:
        result = apmc_service.find_best_apmc(
            db,
            commodity=commodity,
            user_lat=latitude,
            user_lon=longitude,
            max_distance_km=max_distance_km,
            state=state,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find best APMC: {exc}",
        )


# --------------------------------------------------------------------------
# GET /api/apmc/trends
# --------------------------------------------------------------------------

@router.get(
    "/trends",
    summary="Get price trends",
    description=(
        "Returns price trend analysis over the specified period (7 or 30 days). "
        "Includes daily price history, trend direction, statistics, and outliers. "
        "Falls back to all available data when no records exist in the window."
    ),
)
async def get_price_trends(
    commodity: str = Query(
        ..., min_length=1, max_length=100, description="Commodity name"
    ),
    state: Optional[str] = Query(
        None, max_length=100, description="State filter"
    ),
    days: int = Query(
        7, ge=1, le=365, description="Lookback period in days"
    ),
    db: Session = Depends(get_db),
):
    """Get price trend analysis for a commodity."""
    try:
        result = apmc_service.get_price_trends(
            db, commodity=commodity, state=state, days=days
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze price trends: {exc}",
        )


# --------------------------------------------------------------------------
# GET /api/apmc/sell-advisory
# --------------------------------------------------------------------------

@router.get(
    "/sell-advisory",
    summary="Get storage vs sell recommendation",
    description=(
        "Analyzes current market conditions and provides a recommendation "
        "on whether to sell immediately or store the commodity for better prices. "
        "Also provides the best time window to sell based on historical patterns."
    ),
)
async def get_sell_advisory(
    commodity: str = Query(
        ..., min_length=1, max_length=100, description="Commodity name"
    ),
    current_price: Optional[float] = Query(
        None, ge=0, description="Current offered price (optional, uses latest market price if not provided)"
    ),
    state: Optional[str] = Query(
        None, max_length=100, description="State filter for regional analysis"
    ),
    db: Session = Depends(get_db),
):
    """Get sell advisory with storage vs immediate sell recommendation."""
    try:
        result = apmc_service.get_sell_advisory(
            db, commodity=commodity, current_price=current_price, state=state
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate sell advisory: {exc}",
        )
