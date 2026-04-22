import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Depends

from app.routers.auth import admin_required

router = APIRouter(prefix="/content", tags=["Content"])

CONTENT_FILE = Path(__file__).resolve().parent.parent / "data" / "landing_content.json"


def read_content() -> dict[str, Any]:
    if not CONTENT_FILE.exists():
        raise HTTPException(status_code=404, detail="Konten landing tidak ditemukan")

    with CONTENT_FILE.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def write_content(payload: dict[str, Any]) -> None:
    CONTENT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONTENT_FILE.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


@router.get("/landing")
def get_landing_content():
    return read_content()


@router.put("/landing")
def update_landing_content(
    payload: dict[str, Any] = Body(...),
    current_user: dict = Depends(admin_required),
):
    if "features" not in payload or "hero" not in payload or "why" not in payload:
        raise HTTPException(status_code=422, detail="Payload konten landing belum lengkap")

    write_content(payload)
    return {
        "message": "Konten landing berhasil diperbarui",
        "updated_by": current_user.get("user_id"),
    }
