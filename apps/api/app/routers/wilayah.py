from fastapi import APIRouter

from app.services.master_wilayah import (
    list_districts,
    list_provinces,
    list_regencies,
    list_villages,
)

router = APIRouter(prefix="/wilayah", tags=["Wilayah"])


@router.get("/provinsi")
def get_provinsi():
    return {"success": True, "data": list_provinces()}


@router.get("/kabupaten/{provinsi_id}")
def get_kabupaten(provinsi_id: str):
    return {"success": True, "data": list_regencies(provinsi_id)}


@router.get("/kecamatan/{kabupaten_id}")
def get_kecamatan(kabupaten_id: str):
    return {"success": True, "data": list_districts(kabupaten_id)}


@router.get("/desa/{kecamatan_id}")
def get_desa(kecamatan_id: str):
    return {"success": True, "data": list_villages(kecamatan_id)}
