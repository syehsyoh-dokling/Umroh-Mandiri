from fastapi import APIRouter, HTTPException, Query

from app.services.master_wilayah import (
    list_districts,
    list_provinces,
    list_regencies,
    list_villages,
    resolve_village,
)

router = APIRouter(prefix="/master-wilayah/v1", tags=["Master Wilayah"])


def _payload(data):
    return {
        "success": True,
        "meta": {"count": len(data)},
        "data": data,
    }


@router.get("/health", summary="Health check for the reusable master wilayah service")
def health():
    return {
        "success": True,
        "service": "master-wilayah",
        "version": "v1",
    }


@router.get("/provinces", summary="List all Indonesian provinces")
def get_provinces():
    return _payload(list_provinces())


@router.get("/regencies", summary="List regencies or cities by province")
def get_regencies(
    province_id: str = Query(..., min_length=2, max_length=2),
):
    return _payload(list_regencies(province_id))


@router.get("/districts", summary="List districts by regency or city")
def get_districts(
    regency_id: str = Query(..., min_length=4, max_length=4),
):
    return _payload(list_districts(regency_id))


@router.get("/villages", summary="List villages by district")
def get_villages(
    district_id: str = Query(..., min_length=7, max_length=7),
):
    return _payload(list_villages(district_id))


@router.get("/villages/{village_id}/path", summary="Resolve one village into its full path")
def get_village_path(village_id: str):
    resolved = resolve_village(village_id)
    if not resolved:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")

    return {
        "success": True,
        "data": resolved,
    }
