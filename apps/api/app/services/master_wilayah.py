from sqlalchemy import text

from app.database import engine_wilayah


def _fetch_all(query: str, params: dict | None = None):
    with engine_wilayah.connect() as conn:
        rows = conn.execute(text(query), params or {}).mappings().all()
    return [dict(row) for row in rows]


def list_provinces():
    return _fetch_all(
        """
        SELECT id, TRIM(name) AS name
        FROM provinces
        ORDER BY name ASC
        """
    )


def list_regencies(province_id: str):
    return _fetch_all(
        """
        SELECT id, province_id, TRIM(name) AS name
        FROM regencies
        WHERE province_id = :province_id
        ORDER BY name ASC
        """,
        {"province_id": province_id},
    )


def list_districts(regency_id: str):
    return _fetch_all(
        """
        SELECT id, regency_id, TRIM(name) AS name
        FROM districts
        WHERE regency_id = :regency_id
        ORDER BY name ASC
        """,
        {"regency_id": regency_id},
    )


def list_villages(district_id: str):
    return _fetch_all(
        """
        SELECT id, district_id, TRIM(name) AS name
        FROM villages
        WHERE district_id = :district_id
        ORDER BY name ASC
        """,
        {"district_id": district_id},
    )


def resolve_village(village_id: str):
    rows = _fetch_all(
        """
        SELECT
            v.id AS village_id,
            TRIM(v.name) AS village_name,
            d.id AS district_id,
            TRIM(d.name) AS district_name,
            r.id AS regency_id,
            TRIM(r.name) AS regency_name,
            p.id AS province_id,
            TRIM(p.name) AS province_name
        FROM villages v
        INNER JOIN districts d ON d.id = v.district_id
        INNER JOIN regencies r ON r.id = d.regency_id
        INNER JOIN provinces p ON p.id = r.province_id
        WHERE v.id = :village_id
        LIMIT 1
        """,
        {"village_id": village_id},
    )
    return rows[0] if rows else None


def get_region_summary(
    province_id: str | None = None,
    regency_id: str | None = None,
    district_id: str | None = None,
    village_id: str | None = None,
):
    region = {
        "province_id": province_id,
        "province_name": None,
        "regency_id": regency_id,
        "regency_name": None,
        "district_id": district_id,
        "district_name": None,
        "village_id": village_id,
        "village_name": None,
    }

    if village_id:
        resolved = resolve_village(village_id)
        if resolved:
            return resolved

    if province_id:
        province_rows = _fetch_all(
            """
            SELECT id AS province_id, TRIM(name) AS province_name
            FROM provinces
            WHERE id = :province_id
            LIMIT 1
            """,
            {"province_id": province_id},
        )
        if province_rows:
            region.update(province_rows[0])

    if regency_id:
        regency_rows = _fetch_all(
            """
            SELECT id AS regency_id, province_id, TRIM(name) AS regency_name
            FROM regencies
            WHERE id = :regency_id
            LIMIT 1
            """,
            {"regency_id": regency_id},
        )
        if regency_rows:
            region.update(regency_rows[0])

    if district_id:
        district_rows = _fetch_all(
            """
            SELECT id AS district_id, regency_id, TRIM(name) AS district_name
            FROM districts
            WHERE id = :district_id
            LIMIT 1
            """,
            {"district_id": district_id},
        )
        if district_rows:
            region.update(district_rows[0])

    return region
