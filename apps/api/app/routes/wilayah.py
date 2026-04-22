from fastapi import APIRouter
from sqlalchemy import text
from app.database import engine

router = APIRouter(prefix="/wilayah", tags=["Wilayah"])


@router.get("/provinsi")
def get_provinsi():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, name 
            FROM provinces 
            ORDER BY name ASC
        """)).fetchall()

    return {
        "success": True,
        "data": [dict(r._mapping) for r in result]
    }


@router.get("/kabupaten/{provinsi_id}")
def get_kabupaten(provinsi_id: int):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, name 
            FROM districts 
            ORDER BY name ASC
        """)).fetchall()

    return {
        "success": True,
        "data": [dict(r._mapping) for r in result]
    }


@router.get("/kecamatan/{kabupaten_id}")
def get_kecamatan(kabupaten_id: int):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT subdis_id AS id, subdis_name AS name 
            FROM subdistricts 
            WHERE dis_id = :id
            ORDER BY subdis_name ASC
        """), {"id": kabupaten_id}).fetchall()

    return {
        "success": True,
        "data": [dict(r._mapping) for r in result]
    }


@router.get("/desa/{kecamatan_id}")
def get_desa(kecamatan_id: int):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, name 
            FROM villages 
            WHERE district_id = :id
            ORDER BY name ASC
        """), {"id": kecamatan_id}).fetchall()

    return {
        "success": True,
        "data": [dict(r._mapping) for r in result]
    }
