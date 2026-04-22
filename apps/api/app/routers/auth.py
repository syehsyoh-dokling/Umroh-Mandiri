from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Body, Query
from sqlalchemy import text
from app.database import engine
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
import hashlib

router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = "SECRET123"
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_HOURS = 12
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def verify_password(plain: str, stored_password: str) -> bool:
    hashed_input = hashlib.sha256(plain.encode()).hexdigest()
    return hashed_input == stored_password


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "user_id": user_id,
        "role": role,
        "type": "access",
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "user_id": user_id,
        "role": role,
        "type": "refresh",
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login")
def login(
    body: Optional[dict] = Body(default=None),
    email: Optional[str] = Query(default=None),
    password: Optional[str] = Query(default=None),
):
    if body:
        email = body.get("email", email)
        password = body.get("password", password)

    if not email or not password:
        raise HTTPException(status_code=422, detail="Email dan password wajib diisi")

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, nama, email, password, role FROM users WHERE email=:email"),
            {"email": email}
        ).fetchone()

    if not result:
        raise HTTPException(status_code=401, detail="Email tidak ditemukan")

    user = dict(result._mapping)

    if not user.get("password"):
        raise HTTPException(status_code=500, detail="Password di database kosong")

    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Password salah")

    access_token = create_access_token(user["id"], user["role"])
    refresh_token = create_refresh_token(user["id"], user["role"])

    login_meta = {
        "referral_code": body.get("referral_code") if body else None,
        "ip_address": body.get("ip_address") if body else None,
        "device_location": body.get("device_location") if body else None,
        "user_agent": body.get("user_agent") if body else None,
        "page_code": body.get("page_code") if body else None,
    }

    update_fields = {
        "referral_code": login_meta["referral_code"],
        "last_ip": login_meta["ip_address"],
        "last_location": login_meta["device_location"],
        "user_agent": login_meta["user_agent"],
        "last_page_code": login_meta["page_code"],
    }
    assignments = []
    params = {"id": user["id"]}
    for field, value in update_fields.items():
        if value:
            assignments.append(f"{field} = :{field}")
            params[field] = value

    assignments.append("last_login = :last_login")
    params["last_login"] = datetime.now(timezone.utc).replace(tzinfo=None)

    with engine.connect() as conn:
        conn.execute(
            text(f"UPDATE users SET {', '.join(assignments)} WHERE id = :id"),
            params,
        )
        conn.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in_hours": ACCESS_TOKEN_EXPIRE_HOURS,
        "refresh_expires_in_days": REFRESH_TOKEN_EXPIRE_DAYS,
        "user": {
            "id": user["id"],
            "nama": user["nama"],
            "email": user["email"],
            "role": user["role"]
        }
    }


@router.post("/refresh")
def refresh_token(body: Optional[dict] = Body(default=None)):
    if not body or not body.get("refresh_token"):
        raise HTTPException(status_code=422, detail="refresh_token wajib diisi")

    token = body.get("refresh_token")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token tidak valid atau expired")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token bukan refresh token")

    user_id = payload.get("user_id")
    role = payload.get("role")

    if not user_id or not role:
        raise HTTPException(status_code=401, detail="Payload refresh token tidak lengkap")

    new_access_token = create_access_token(user_id, role)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in_hours": ACCESS_TOKEN_EXPIRE_HOURS
    }


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Access token tidak valid")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid atau expired")


def admin_required(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return current_user


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
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
                    last_page_code
                FROM users
                WHERE id=:id
                """
            ),
            {"id": user_id}
        ).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    return {
        "user": dict(result._mapping),
        "token_payload": current_user
    }
