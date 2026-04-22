import json
import os
import ssl
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, Query, Request as FastAPIRequest
import pymysql

router = APIRouter(prefix="/legacy-pricing", tags=["Legacy Pricing"])

HOTEL_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/hotel_endpoin.php"
TICKET_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get_tiket_pp.php"
TICKET_CACHE_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get_tiket_pp_cache.php"
TICKET_MULTIHOP_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get_tiket_pp_multihop.php"
TICKET_CHEAPEST_ENDPOINT = "https://apiutama.danandad.com/muwahid/get_top3_oct_3plus3.php"
VISA_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get_visa_types.php"
SISKOPATUH_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get_siskopatuh.php"
AJUKAN_VISA_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/ajukan_visa.php"
MUTHAWIF_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get_muthawif.php"
TRANSPORT_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/transport/api_transport.php"
FAQ_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/get-faq.php"
FAQ_USAGE_ENDPOINT = "https://apidua.poligami.org/interaksi/routes/faq_usage.php"

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "UmrohIktikaf#2026")
LEGACY_DB = os.getenv("LEGACY_PRICING_DB", "umroh_legacy_local")
ANALYTICS_DB = os.getenv("ANALYTICS_DB", "umroh_ticket_analytics")


def open_url_with_legacy_ssl(request_or_url: str | Request, timeout: int = 20):
    try:
        return urlopen(request_or_url, timeout=timeout)
    except ssl.SSLCertVerificationError:
        legacy_context = ssl._create_unverified_context()
        return urlopen(request_or_url, timeout=timeout, context=legacy_context)
    except URLError as exc:
        if isinstance(getattr(exc, "reason", None), ssl.SSLCertVerificationError):
            legacy_context = ssl._create_unverified_context()
            return urlopen(request_or_url, timeout=timeout, context=legacy_context)
        raise


def get_mysql_connection(database: str):
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def normalize_bucket_label(bucket: str | None):
    value = str(bucket or "").strip().lower().replace("_", "").replace(" ", "")
    if value in {"direct", "0stop", "0stops", "directr1"}:
        return "direct"
    if value in {"1stop", "onestop", "st1monor1"}:
        return "one_stop"
    if value in {"2stop", "twostop"}:
        return "two_stop"
    return None


def append_ticket_bucket(result: dict[str, list[dict]], bucket: str | None, record: dict):
    normalized = normalize_bucket_label(bucket)
    if normalized:
        result[normalized].append(record)


def local_ticket_cheapest(origin: str, ym: str):
    outbound = {"direct": [], "one_stop": [], "two_stop": []}
    inbound = {"direct": [], "one_stop": [], "two_stop": []}

    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  origin,
                  destination,
                  bucket,
                  CONCAT(%s, '-15') AS tanggal,
                  MIN(COALESCE(price_idr, harga_total)) AS price_idr
                FROM tiket_pp_harian
                WHERE origin = %s AND DATE_FORMAT(tgl_berangkat, '%%Y-%%m') = %s
                GROUP BY origin, destination, bucket
                """,
                (ym, origin, ym),
            )
            outbound_rows = cur.fetchall()

    with get_mysql_connection(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  origin,
                  destination,
                  bucket,
                  CONCAT(projected_month, '-15') AS tanggal,
                  projected_price_idr AS price_idr
                FROM ticket_price_projections
                WHERE origin = %s AND projected_month = %s
                """,
                (origin, ym),
            )
            projected_outbound = cur.fetchall()

            cur.execute(
                """
                SELECT
                  origin,
                  destination,
                  bucket,
                  CONCAT(projected_month, '-15') AS tanggal,
                  projected_price_idr AS price_idr
                FROM ticket_price_projections
                WHERE destination = %s AND projected_month = %s
                """,
                (origin, ym),
            )
            projected_inbound = cur.fetchall()

    seen_outbound = set()
    for row in outbound_rows:
        record = {
            "origin": row["origin"],
            "destination": row["destination"],
            "bucket": row["bucket"],
            "tanggal": row["tanggal"],
            "harga_total": int(row["price_idr"] or 0),
            "price_idr": int(row["price_idr"] or 0),
            "airline_summary": "Data legacy lokal",
        }
        key = (row["destination"], normalize_bucket_label(row["bucket"]))
        seen_outbound.add(key)
        append_ticket_bucket(outbound, row["bucket"], record)

    for row in projected_outbound:
        key = (row["destination"], normalize_bucket_label(row["bucket"]))
        if key in seen_outbound:
            continue
        record = {
            "origin": row["origin"],
            "destination": row["destination"],
            "bucket": row["bucket"],
            "tanggal": row["tanggal"],
            "harga_total": int(row["price_idr"] or 0),
            "price_idr": int(row["price_idr"] or 0),
            "airline_summary": "Estimasi trend lokal",
        }
        append_ticket_bucket(outbound, row["bucket"], record)

    for row in projected_inbound:
        record = {
            "origin": row["origin"],
            "destination": row["destination"],
            "bucket": row["bucket"],
            "tanggal": row["tanggal"],
            "harga_total": int(row["price_idr"] or 0),
            "price_idr": int(row["price_idr"] or 0),
            "airline_summary": "Estimasi trend lokal",
        }
        append_ticket_bucket(inbound, row["bucket"], record)

    return {
        "ok": True,
        "origin": origin,
        "month": ym,
        "months": 1,
        "range": [f"{ym}-01", f"{ym}-31"],
        "outbound": outbound,
        "inbound": inbound,
        "source": "local-db",
    }


def fetch_remote_json(base_url: str, params: dict[str, str | int | None]):
    clean_params = {key: value for key, value in params.items() if value not in (None, "", [])}
    url = base_url if not clean_params else f"{base_url}?{urlencode(clean_params)}"

    try:
        with open_url_with_legacy_ssl(url, timeout=20) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil data legacy: {exc}")


def post_remote_form_json(base_url: str, payload: dict[str, str | int | None]):
    clean_params = {key: value for key, value in payload.items() if value not in (None, "", [])}
    encoded = urlencode(clean_params).encode("utf-8")
    request = Request(base_url, data=encoded, headers={"Content-Type": "application/x-www-form-urlencoded"})

    try:
      with open_url_with_legacy_ssl(request, timeout=20) as response:
          payload = response.read().decode("utf-8")
          return json.loads(payload)
    except Exception as exc:
      raise HTTPException(status_code=502, detail=f"Gagal mengirim ke layanan legacy: {exc}")


def post_remote_json(base_url: str, payload: dict[str, str | int | None]):
    encoded = json.dumps(payload).encode("utf-8")
    request = Request(base_url, data=encoded, headers={"Content-Type": "application/json"})

    try:
        with open_url_with_legacy_ssl(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {"success": True, "raw": raw}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gagal mengirim ke layanan legacy: {exc}")


@router.get("/hotels")
def get_hotels(
    city: str = Query(...),
    stars: str | None = Query(default=None),
    band: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=20),
):
    return fetch_remote_json(
        HOTEL_ENDPOINT,
        {
            "city": city,
            "stars": stars,
            "band": band,
            "q": q,
            "limit": limit,
        },
    )


@router.get("/tickets")
def get_tickets(
    origin: str = Query(...),
    destination: str = Query(...),
    date: str = Query(...),
):
    return fetch_remote_json(
        TICKET_ENDPOINT,
        {
            "origin": origin,
            "destination": destination,
            "date": date,
        },
    )


@router.post("/tickets-cache")
async def get_ticket_cache(request: FastAPIRequest):
    body = await request.json()
    payload = {
        "origin": body.get("origin"),
        "destination": body.get("destination"),
        "date": body.get("date"),
        "limit": body.get("limit"),
        "min_price": body.get("min_price"),
        "max_price": body.get("max_price"),
    }
    return post_remote_json(TICKET_CACHE_ENDPOINT, payload)


@router.post("/tickets-multihop")
async def get_ticket_multihop(request: FastAPIRequest):
    body = await request.json()
    payload = {
        "origin": body.get("origin"),
        "destination": body.get("destination"),
        "date": body.get("date"),
        "skip_cache": body.get("skip_cache"),
    }
    return post_remote_json(TICKET_MULTIHOP_ENDPOINT, payload)


@router.get("/tickets-cheapest")
def get_tickets_cheapest(
    origin: str = Query(...),
    ym: str = Query(...),
    limit: int = Query(default=120),
):
    try:
        local_data = local_ticket_cheapest(origin, ym)
        outbound_total = sum(len(local_data["outbound"][bucket]) for bucket in ("direct", "one_stop", "two_stop"))
        inbound_total = sum(len(local_data["inbound"][bucket]) for bucket in ("direct", "one_stop", "two_stop"))
        if outbound_total or inbound_total:
            return local_data
    except Exception:
        pass

    return fetch_remote_json(
        TICKET_CHEAPEST_ENDPOINT,
        {
            "origin": origin,
            "ym": ym,
            "limit": limit,
        },
    )


@router.get("/visa-types")
def get_visa_types():
    return fetch_remote_json(VISA_ENDPOINT, {})


@router.get("/siskopatuh")
def get_siskopatuh():
    return fetch_remote_json(SISKOPATUH_ENDPOINT, {})


@router.post("/visa-application")
async def submit_visa_application(request: FastAPIRequest):
    body = await request.json()
    payload = {
        "tanggal_berangkat": body.get("tanggal_berangkat"),
        "bandara_asal": body.get("bandara_asal"),
        "kebutuhan": body.get("kebutuhan"),
        "jenis_visa": body.get("jenis_visa"),
        "email": body.get("email"),
        "wa": body.get("wa"),
        "nama": body.get("nama"),
        "harga": body.get("harga"),
        "sid": body.get("sid"),
        "ip": body.get("ip"),
        "lokasi": body.get("lokasi"),
        "tgl_jemput": body.get("tgl_jemput"),
        "bandara_jemput": body.get("bandara_jemput"),
        "tgl_antar": body.get("tgl_antar"),
        "bandara_antar": body.get("bandara_antar"),
        "notify_email": body.get("notify_email"),
    }
    return post_remote_form_json(AJUKAN_VISA_ENDPOINT, payload)


@router.get("/faq")
def get_faq(menu: str = Query(...)):
    return fetch_remote_json(FAQ_ENDPOINT, {"menu": menu})


@router.post("/faq-usage")
async def post_faq_usage(request: FastAPIRequest):
    body = await request.json()
    payload = {
        "faq_id": body.get("faq_id"),
        "menu": body.get("menu"),
        "sid": body.get("sid"),
    }
    return post_remote_json(FAQ_USAGE_ENDPOINT, payload)


@router.get("/muthawif")
def get_muthawif(
    q: str | None = Query(default=None),
    meet: str | None = Query(default=None),
    date: str | None = Query(default=None),
    limit: int = Query(default=20),
):
    return fetch_remote_json(
        MUTHAWIF_ENDPOINT,
        {
            "q": q,
            "meet": meet,
            "date": date,
            "limit": limit,
        },
    )


@router.get("/transport-rates")
def get_transport_rates(company: str | None = Query(default=None)):
    return fetch_remote_json(
        TRANSPORT_ENDPOINT,
        {
            "action": "rates",
            "company": company,
        },
    )
