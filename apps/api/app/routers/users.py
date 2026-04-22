import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.database import engine
from app.routers.auth import admin_required, get_current_user
from app.schemas.user import UserCreate, UserUpdate
from app.services.master_wilayah import get_region_summary

router = APIRouter(prefix="/users", tags=["Users"])


def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()


@router.get("/")
def get_users(current_user=Depends(admin_required)):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, nama, email, role, created_at FROM users LIMIT 20")
        ).fetchall()

    return {"data": [dict(r._mapping) for r in result]}


@router.post("/")
def create_user(user: UserCreate):
    hashed_password = hash_password(user.password)

    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO users (
                        nama,
                        email,
                        wa,
                        password,
                        role,
                        referral_code,
                        prov_id,
                        city_id,
                        dis_id,
                        desa_id,
                        last_ip,
                        last_location,
                        user_agent
                    ) VALUES (
                        :name,
                        :email,
                        :phone,
                        :password,
                        :role,
                        :referral_code,
                        :prov_id,
                        :city_id,
                        :dis_id,
                        :desa_id,
                        :ip_address,
                        :device_location,
                        :user_agent
                    )
                    """
                ),
                {
                    "name": user.name,
                    "email": user.email,
                    "phone": user.phone,
                    "password": hashed_password,
                    "role": user.role,
                    "referral_code": user.referral_code,
                    "prov_id": user.prov_id,
                    "city_id": user.city_id,
                    "dis_id": user.dis_id,
                    "desa_id": user.desa_id,
                    "ip_address": user.ip_address,
                    "device_location": user.device_location,
                    "user_agent": user.user_agent,
                },
            )
            conn.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")

    return {"message": "User berhasil dibuat (hashed)"}


@router.get("/me")
def get_my_profile(current_user=Depends(get_current_user)):
    user_id = current_user.get("user_id")

    with engine.connect() as conn:
        result = conn.execute(
            text(
                """
                SELECT
                    id,
                    nama,
                    email,
                    wa,
                    role,
                    referral_code,
                    prov_id,
                    city_id,
                    dis_id,
                    desa_id,
                    last_ip,
                    last_location,
                    user_agent,
                    created_at
                FROM users
                WHERE id = :id
                LIMIT 1
                """
            ),
            {"id": user_id},
        ).mappings().first()

    if not result:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    user = dict(result)
    user["region"] = get_region_summary(
        province_id=user.get("prov_id"),
        regency_id=user.get("city_id"),
        district_id=user.get("dis_id"),
        village_id=user.get("desa_id"),
    )

    return {"user": user}


@router.patch("/me")
def update_my_profile(payload: UserUpdate, current_user=Depends(get_current_user)):
    user_id = current_user.get("user_id")

    updates = payload.model_dump(exclude_unset=True)
    field_map = {
        "name": "nama",
        "email": "email",
        "phone": "wa",
        "prov_id": "prov_id",
        "city_id": "city_id",
        "dis_id": "dis_id",
        "desa_id": "desa_id",
        "referral_code": "referral_code",
        "ip_address": "last_ip",
        "device_location": "last_location",
        "user_agent": "user_agent",
    }

    if not updates:
        raise HTTPException(status_code=422, detail="Tidak ada data yang diubah")

    assignments = []
    params = {"id": user_id}
    for key, value in updates.items():
        column = field_map[key]
        assignments.append(f"{column} = :{key}")
        params[key] = value

    query = f"UPDATE users SET {', '.join(assignments)} WHERE id = :id"

    try:
        with engine.connect() as conn:
            conn.execute(text(query), params)
            conn.commit()
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")

    return get_my_profile(current_user)
