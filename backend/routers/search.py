from fastapi import APIRouter, Query, HTTPException
import logging
from ..models import SearchResponse
from ..search import search_segments

router = APIRouter()

@router.get("/api/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., description="Search query"),
    file: str = Query("", description="Filter by video basename"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(25, ge=1, le=100, description="Results limit"),
    fuzzy: int = Query(0, ge=0, le=1, description="Enable fuzzy search")
):
    """Search segments across videos"""
    if not q.strip():
        return SearchResponse(total=0, items=[])
    
    try:
        results, total = search_segments(
            query=q,
            file_basename=file,
            limit=limit,
            offset=offset,
            fuzzy=bool(fuzzy)
        )
        
        return SearchResponse(total=total, items=results)
        
    except Exception as e:
        logging.error(f"Search failed for query '{q}': {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Search failed: {str(e)}"
        )