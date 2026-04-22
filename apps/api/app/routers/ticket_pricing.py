import json
import os
from collections import defaultdict
from datetime import datetime, timedelta

import pymysql
import requests
from fastapi import APIRouter, HTTPException, Query, Request as FastAPIRequest

router = APIRouter(prefix="/ticket-pricing/v1", tags=["Ticket Pricing"])

MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "UmrohIktikaf#2026")
LEGACY_DB = os.getenv("LEGACY_PRICING_DB", "umroh_legacy_local")
ANALYTICS_DB = os.getenv("ANALYTICS_DB", "umroh_ticket_analytics")
APP_DB = os.getenv("APP_DB", "umroh_dev")
USD_TO_IDR = int(os.getenv("USD_TO_IDR", "16000"))
DIRECT_HUBS = {"CGK", "KUL", "SIN"}
SAUDI_AIRPORTS = {"JED", "MED"}
AMADEUS_BASE_URL = os.getenv("AMADEUS_BASE_URL", "https://test.api.amadeus.com")
AMADEUS_CLIENT_ID = os.getenv("AMADEUS_CLIENT_ID", "6LOGC1pKyHlaxlb29yGpL8vnDLS32P9I")
AMADEUS_CLIENT_SECRET = os.getenv("AMADEUS_CLIENT_SECRET", "Y4XSAYlUTrMV0bz3")
SECONDARY_TICKET_PROVIDER_URL = os.getenv("SECONDARY_TICKET_PROVIDER_URL", "")
LIVE_PROVIDER_TIMEOUT = int(os.getenv("LIVE_PROVIDER_TIMEOUT_SECONDS", "30"))
AMADEUS_AUTH_TIMEOUT = int(os.getenv("AMADEUS_AUTH_TIMEOUT_SECONDS", "10"))
AMADEUS_SEARCH_TIMEOUT = int(os.getenv("AMADEUS_SEARCH_TIMEOUT_SECONDS", "20"))


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


def normalize_bucket_value(bucket: str | None, num_stops: int | None = None):
    value = str(bucket or "").strip().lower().replace("_", "").replace(" ", "")
    if value in {"direct", "0stop", "0stops", "directr1"}:
        return "direct"
    if value in {"1stop", "onestop", "st1monor1"}:
        return "one_stop"
    if value in {"2stop", "twostop"}:
        return "two_stop"
    if num_stops is not None:
        if int(num_stops) <= 0:
            return "direct"
        if int(num_stops) == 1:
            return "one_stop"
        return "two_stop"
    return "other"


def denormalize_bucket_value(bucket: str):
    return {"direct": "direct", "one_stop": "1stop", "two_stop": "2stop"}.get(bucket, "1stop")


def empty_ticket_groups():
    return {"direct": [], "one_stop": [], "two_stop": []}


def empty_ticket_response(origin: str, destination: str, date: str):
    return {
        "ok": True,
        "source": "internal-db",
        "meta": {
            "origin": origin,
            "destination": destination,
            "date": date,
        },
        "direct": [],
        "onestop": [],
        "twostop": [],
    }


def append_group(groups: dict[str, list[dict]], record: dict, bucket: str | None, num_stops: int | None = None):
    normalized = normalize_bucket_value(bucket, num_stops)
    if normalized in groups:
        groups[normalized].append(record)


def price_to_idr(price_total, currency: str | None):
    amount = float(price_total or 0)
    if amount <= 0:
        return 0
    if str(currency or "IDR").upper() == "USD":
        return int(round(amount * USD_TO_IDR))
    return int(round(amount))


def normalize_idr_guess(amount):
    value = int(round(float(amount or 0)))
    if 0 < value < 10000:
        return int(round(value * USD_TO_IDR))
    return value


def estimate_floor(bucket_name: str):
    return {
        "direct": 7500000,
        "one_stop": 6500000,
        "two_stop": 7000000,
    }.get(bucket_name, 6500000)


def allow_direct_route(origin: str, destination: str):
    origin_code = str(origin or "").upper()
    destination_code = str(destination or "").upper()
    if destination_code in SAUDI_AIRPORTS:
        return origin_code in DIRECT_HUBS
    if origin_code in SAUDI_AIRPORTS:
        return destination_code in DIRECT_HUBS
    return origin_code in DIRECT_HUBS and destination_code in DIRECT_HUBS


def strip_direct_if_needed(groups: dict[str, list[dict]], origin: str, destination: str):
    if allow_direct_route(origin, destination):
        return groups
    cleaned = dict(groups)
    cleaned["direct"] = []
    return cleaned


def normalize_estimated_price(amount, bucket_name: str):
    value = normalize_idr_guess(amount)
    if value <= 0:
        return 0
    return max(value, estimate_floor(bucket_name))


def sql_price_expr():
    return (
        f"COALESCE("
        f"CASE WHEN NULLIF(price_idr, 0) IS NOT NULL AND price_idr >= 10000 THEN price_idr END,"
        f"CASE "
        f"WHEN UPPER(COALESCE(currency, 'IDR'))='USD' AND NULLIF(price_usd, 0) IS NOT NULL THEN ROUND(price_usd*{USD_TO_IDR}) "
        f"WHEN UPPER(COALESCE(currency, 'IDR'))='USD' THEN ROUND(harga_total*{USD_TO_IDR}) "
        f"WHEN NULLIF(harga_total, 0) IS NOT NULL AND harga_total < 10000 THEN ROUND(harga_total*{USD_TO_IDR}) "
        f"ELSE NULLIF(harga_total, 0) END"
        f")"
    )


def sort_grouped(groups: dict[str, list[dict]], limit: int | None = None):
    for bucket_name in groups:
        groups[bucket_name] = sorted(groups[bucket_name], key=lambda item: int(item.get("price_idr") or item.get("harga_total") or 0))
        if limit:
            groups[bucket_name] = groups[bucket_name][:limit]
    return groups


def year_month_distance(left: str, right: str):
    try:
        left_year, left_month = [int(part) for part in left.split("-")]
        right_year, right_month = [int(part) for part in right.split("-")]
        return abs((left_year * 12 + left_month) - (right_year * 12 + right_month))
    except Exception:
        return 999


def record_signature(item: dict):
    segments = item.get("segments") or []
    segment_signature = "|".join(
        f"{seg.get('dep_airport','')}:{seg.get('arr_airport','')}:{seg.get('dep_time','')}:{seg.get('airline_iata','')}"
        for seg in segments
    )
    detail_signature = segment_signature or str(item.get("detail_berangkat") or "")
    summary_signature = str(item.get("airline_summary") or "") if detail_signature else ""
    return (
        item.get("origin"),
        item.get("destination"),
        item.get("tanggal"),
        int(item.get("price_idr") or item.get("harga_total") or 0),
        summary_signature,
        detail_signature,
    )


def dedupe_grouped(groups: dict[str, list[dict]]):
    cleaned = empty_ticket_groups()
    for bucket_name, items in groups.items():
        seen = set()
        for item in items:
            signature = record_signature(item)
            if signature in seen:
                continue
            seen.add(signature)
            cleaned[bucket_name].append(item)
    return cleaned


def synthesize_projection_rows(origin: str, ym: str):
    outbound = empty_ticket_groups()
    inbound = empty_ticket_groups()
    with get_mysql_connection(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT origin, destination, bucket, projected_month, projected_price_idr
                FROM ticket_price_projections
                WHERE origin = %s AND projected_month = %s
                ORDER BY destination, bucket
                """,
                (origin, ym),
            )
            for row in cur.fetchall():
                record = {
                    "origin": row["origin"],
                    "destination": row["destination"],
                    "tanggal": f"{row['projected_month']}-15",
                    "harga_total": normalize_estimated_price(row["projected_price_idr"], normalize_bucket_value(row.get("bucket"))),
                    "price_idr": normalize_estimated_price(row["projected_price_idr"], normalize_bucket_value(row.get("bucket"))),
                    "airline_summary": "Estimasi trend lokal",
                }
                append_group(outbound, record, row["bucket"])

            cur.execute(
                """
                SELECT origin, destination, bucket, projected_month, projected_price_idr
                FROM ticket_price_projections
                WHERE destination = %s AND projected_month = %s
                ORDER BY origin, bucket
                """,
                (origin, ym),
            )
            for row in cur.fetchall():
                record = {
                    "origin": row["origin"],
                    "destination": row["destination"],
                    "tanggal": f"{row['projected_month']}-15",
                    "harga_total": normalize_estimated_price(row["projected_price_idr"], normalize_bucket_value(row.get("bucket"))),
                    "price_idr": normalize_estimated_price(row["projected_price_idr"], normalize_bucket_value(row.get("bucket"))),
                    "airline_summary": "Estimasi trend lokal",
                }
                append_group(inbound, record, row["bucket"])

    return sort_grouped(outbound), sort_grouped(inbound)


def build_segments(legs: list[dict]):
    segments = []
    for leg in legs:
        carriers = str(leg.get("carriers") or "").split(",")
        airline = carriers[0].strip() if carriers and carriers[0].strip() else ""
        segments.append(
            {
                "dep_airport": leg.get("origin"),
                "arr_airport": leg.get("destination"),
                "dep_time": str(leg.get("dep_time_first") or ""),
                "airline_iata": airline,
                "flight_number": "",
            }
        )
    return segments


def build_record(bucket_name: str, final_leg: dict, legs: list[dict]):
    price_idr = sum(price_to_idr(item.get("price_total"), item.get("currency")) for item in legs)
    airline_summary = " / ".join(filter(None, [str(item.get("carriers") or "").strip() for item in legs])) or "Data raw lokal"
    return {
        "origin": legs[0].get("origin"),
        "destination": final_leg.get("destination"),
        "tanggal": str(final_leg.get("depart_date")),
        "harga_total": price_idr,
        "price_idr": price_idr,
        "airline_summary": airline_summary,
        "num_stops_out": {"direct": 0, "one_stop": 1, "two_stop": 2}[bucket_name],
        "detail_berangkat": airline_summary,
        "segments": build_segments(legs),
        "bucket": denormalize_bucket_value(bucket_name),
    }


def scenario_category(bucket_name: str):
    return {"direct": 0, "one_stop": 1, "two_stop": 2}.get(bucket_name, 1)


def airline_summary_from_segments(segments: list[dict]):
    labels = []
    for segment in segments:
        carrier = str(segment.get("airline_iata") or "").strip()
        flight_number = str(segment.get("flight_number") or "").strip()
        label = f"{carrier} {flight_number}".strip()
        if label and label not in labels:
            labels.append(label)
    return " / ".join(labels)


def detail_summary_from_segments(segments: list[dict]):
    parts = []
    for segment in segments:
        dep_airport = segment.get("dep_airport") or "?"
        arr_airport = segment.get("arr_airport") or "?"
        dep_time = str(segment.get("dep_time") or "")
        arr_time = str(segment.get("arr_time") or "")
        airline = " ".join(filter(None, [str(segment.get("airline_iata") or "").strip(), str(segment.get("flight_number") or "").strip()])).strip()
        parts.append(
            f"{dep_airport} {dep_time} -> {arr_airport} {arr_time}".strip() + (f" ({airline})" if airline else "")
        )
    return " | ".join(parts)


def load_route_scenarios(origin: str, destination: str, direction: str, bucket_name: str):
    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT origin, category, direction, hub1, hub2, dest
                FROM route_scenarios
                WHERE origin = %s
                  AND dest = %s
                  AND direction = %s
                  AND category = %s
                  AND is_active = 1
                ORDER BY id ASC
                LIMIT 8
                """,
                (origin, destination, direction, scenario_category(bucket_name)),
            )
            return cur.fetchall()


def find_schedule_leg(dep_airport: str, arr_airport: str, depart_on: str, earliest_dt: datetime | None = None):
    start_date = datetime.strptime(depart_on, "%Y-%m-%d").date()
    end_date = start_date + timedelta(days=1)
    tables = ("raw_flight_legs", "flight_legs_plan")
    for table in tables:
        with get_mysql_connection(LEGACY_DB) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT dep_airport, arr_airport, dep_time, arr_time, airline_iata, flight_number, equipment, duration_min, price_idr
                    FROM {table}
                    WHERE dep_airport = %s
                      AND arr_airport = %s
                      AND dep_date BETWEEN %s AND %s
                    ORDER BY dep_time ASC, price_idr ASC
                    """,
                    (dep_airport, arr_airport, start_date, end_date),
                )
                rows = cur.fetchall()
                candidates = []
                for row in rows:
                    dep_time = row.get("dep_time")
                    if dep_time is None:
                        continue
                    if earliest_dt and dep_time < earliest_dt:
                        continue
                    candidates.append(row)
                if candidates:
                    return candidates[0]
    return None


def build_scheduled_segments(origin: str, destination: str, date_hint: str, bucket_name: str, direction: str):
    scenarios = load_route_scenarios(origin, destination, direction, bucket_name)
    for scenario in scenarios:
        path = [origin]
        if scenario.get("hub1"):
            path.append(str(scenario["hub1"]))
        if scenario.get("hub2"):
            path.append(str(scenario["hub2"]))
        path.append(destination)

        segments = []
        earliest_dt = None
        failed = False
        for index in range(len(path) - 1):
            leg = find_schedule_leg(path[index], path[index + 1], date_hint, earliest_dt)
            if not leg:
                failed = True
                break
            dep_time = leg.get("dep_time")
            arr_time = leg.get("arr_time")
            segments.append(
                {
                    "dep_airport": leg.get("dep_airport"),
                    "arr_airport": leg.get("arr_airport"),
                    "dep_time": dep_time.isoformat() if dep_time else "",
                    "arr_time": arr_time.isoformat() if arr_time else "",
                    "airline_iata": leg.get("airline_iata"),
                    "flight_number": leg.get("flight_number"),
                }
            )
            if arr_time:
                earliest_dt = arr_time + timedelta(minutes=60)
        if not failed and segments:
            return segments
    return []


def enrich_record_with_schedule(record: dict, bucket_name: str, direction: str):
    existing_segments = record.get("segments") or []
    has_rich_segment = any(segment.get("dep_time") or segment.get("flight_number") for segment in existing_segments)
    if has_rich_segment:
        if not record.get("airline_summary"):
            record["airline_summary"] = airline_summary_from_segments(existing_segments)
        if not record.get("detail_berangkat"):
            record["detail_berangkat"] = detail_summary_from_segments(existing_segments)
        return record

    date_hint = str(record.get("tanggal") or "")
    origin = str(record.get("origin") or "")
    destination = str(record.get("destination") or "")
    if not (date_hint and origin and destination):
        return record

    segments = build_scheduled_segments(origin, destination, date_hint, bucket_name, direction)
    if not segments:
        return record

    enriched = dict(record)
    enriched["segments"] = segments
    enriched["airline_summary"] = airline_summary_from_segments(segments) or enriched.get("airline_summary")
    enriched["detail_berangkat"] = detail_summary_from_segments(segments)
    return enriched


def enrich_group_records(groups: dict[str, list[dict]], direction: str):
    enriched = empty_ticket_groups()
    for bucket_name, items in groups.items():
        enriched[bucket_name] = [enrich_record_with_schedule(item, bucket_name, direction) for item in items]
    return enriched


def format_segments_for_detail(segments: list[dict]):
    return " | ".join(
        f"{seg.get('dep_airport','?')} {str(seg.get('dep_time') or '')} -> {seg.get('arr_airport','?')} {str(seg.get('arr_time') or '')}".strip()
        + (f" ({' '.join(filter(None, [str(seg.get('airline_iata') or '').strip(), str(seg.get('flight_number') or '').strip()]))})" if (seg.get("airline_iata") or seg.get("flight_number")) else "")
        for seg in segments
    )


def build_live_record(origin: str, destination: str, date: str, segments: list[dict], total_amount: float, currency: str, source: str):
    bucket_name = normalize_bucket_value(None, max(0, len(segments) - 1))
    price_idr = price_to_idr(total_amount, currency)
    airline_summary = airline_summary_from_segments(segments) or source
    return bucket_name, {
        "origin": origin,
        "destination": destination,
        "tanggal": date,
        "harga_total": price_idr,
        "price_idr": price_idr,
        "airline_summary": airline_summary,
        "num_stops_out": max(0, len(segments) - 1),
        "detail_berangkat": format_segments_for_detail(segments),
        "segments": segments,
        "bucket": denormalize_bucket_value(bucket_name),
    }


def fetch_amadeus_access_token():
    if not (AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET):
        raise RuntimeError("Amadeus credentials not configured")
    response = requests.post(
        f"{AMADEUS_BASE_URL}/v1/security/oauth2/token",
        data={
            "grant_type": "client_credentials",
            "client_id": AMADEUS_CLIENT_ID,
            "client_secret": AMADEUS_CLIENT_SECRET,
        },
        timeout=AMADEUS_AUTH_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    token = payload.get("access_token")
    if not token:
        raise RuntimeError("Amadeus token missing")
    return token


def fetch_amadeus_live_groups(origin: str, destination: str, date: str):
    token = fetch_amadeus_access_token()
    response = requests.get(
        f"{AMADEUS_BASE_URL}/v2/shopping/flight-offers",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        params={
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": date,
            "adults": 1,
            "max": 30,
            "currencyCode": "IDR",
        },
        timeout=AMADEUS_SEARCH_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    groups = empty_ticket_groups()
    for offer in payload.get("data", []):
        itineraries = offer.get("itineraries") or []
        if not itineraries:
            continue
        first_itinerary = itineraries[0]
        raw_segments = first_itinerary.get("segments") or []
        if not raw_segments:
            continue
        segments = []
        for seg in raw_segments:
            segments.append(
                {
                    "dep_airport": seg.get("departure", {}).get("iataCode"),
                    "arr_airport": seg.get("arrival", {}).get("iataCode"),
                    "dep_time": seg.get("departure", {}).get("at"),
                    "arr_time": seg.get("arrival", {}).get("at"),
                    "airline_iata": seg.get("carrierCode"),
                    "flight_number": seg.get("number"),
                }
            )
        bucket_name, record = build_live_record(
            origin=origin,
            destination=destination,
            date=date,
            segments=segments,
            total_amount=float(offer.get("price", {}).get("grandTotal") or offer.get("price", {}).get("total") or 0),
            currency=str(offer.get("price", {}).get("currency") or "IDR"),
            source="Amadeus Live",
        )
        groups[bucket_name].append(record)
    return sort_grouped(dedupe_grouped(groups), limit=12)


def fetch_secondary_live_groups(origin: str, destination: str, date: str):
    if not SECONDARY_TICKET_PROVIDER_URL:
        raise RuntimeError("Secondary live provider not configured")
    response = requests.get(
        SECONDARY_TICKET_PROVIDER_URL,
        params={"origin": origin, "destination": destination, "date": date},
        timeout=LIVE_PROVIDER_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    groups = normalize_buckets_payload(payload)
    return sort_grouped(dedupe_grouped(groups), limit=12)


def normalize_buckets_payload(payload: dict):
    groups = empty_ticket_groups()
    if not isinstance(payload, dict):
        return groups
    for bucket_name, source_keys in {
        "direct": ["direct"],
        "one_stop": ["one_stop", "onestop"],
        "two_stop": ["two_stop", "twostop"],
    }.items():
        for source_key in source_keys:
            for item in payload.get(source_key, []) or []:
                if not isinstance(item, dict):
                    continue
                groups[bucket_name].append(item)
    return groups


def upsert_live_day_results(origin: str, destination: str, date: str, groups: dict[str, list[dict]], source: str):
    flattened = []
    for bucket_name, items in groups.items():
        for item in items:
            flattened.append((bucket_name, item))
    if not flattened:
        return

    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM tiket_pp_harian WHERE origin=%s AND destination=%s AND tgl_berangkat=%s",
                (origin, destination, date),
            )
            insert_sql = """
                INSERT INTO tiket_pp_harian
                (origin, destination, bucket, tgl_berangkat, harga_total, currency, price_idr, harga_depart_est, airline_summary, num_stops_out, detail_berangkat, tgl_crawled)
                VALUES (%s, %s, %s, %s, %s, 'IDR', %s, %s, %s, %s, %s, NOW())
            """
            for bucket_name, item in flattened:
                detail_payload = json.dumps(
                    {
                        "summary": item.get("airline_summary") or source,
                        "segments": item.get("segments") or [],
                        "source": source,
                    },
                    ensure_ascii=False,
                )
                cur.execute(
                    insert_sql,
                    (
                        origin,
                        destination,
                        denormalize_bucket_value(bucket_name),
                        date,
                        int(item.get("price_idr") or item.get("harga_total") or 0),
                        int(item.get("price_idr") or item.get("harga_total") or 0),
                        int(item.get("price_idr") or item.get("harga_total") or 0),
                        item.get("airline_summary") or source,
                        {"direct": 0, "one_stop": 1, "two_stop": 2}[bucket_name],
                        detail_payload,
                    ),
                )


def fetch_live_date_groups(origin: str, destination: str, date: str):
    attempts = []
    providers = [
        ("amadeus", fetch_amadeus_live_groups),
        ("secondary", fetch_secondary_live_groups),
    ]
    for provider_name, provider_fn in providers:
        started = datetime.utcnow()
        try:
            groups = provider_fn(origin, destination, date)
            elapsed_ms = int((datetime.utcnow() - started).total_seconds() * 1000)
            attempts.append({"provider": provider_name, "ok": True, "elapsed_ms": elapsed_ms})
            if sum(len(groups[key]) for key in groups):
                groups = strip_direct_if_needed(groups, origin, destination)
                groups = enrich_group_records(groups, "go")
                upsert_live_day_results(origin, destination, date, groups, provider_name)
                return groups, {"provider": provider_name, "attempts": attempts}
        except Exception as exc:
            elapsed_ms = int((datetime.utcnow() - started).total_seconds() * 1000)
            attempts.append({"provider": provider_name, "ok": False, "elapsed_ms": elapsed_ms, "error": str(exc)})
            continue
    return None, {"provider": None, "attempts": attempts}


def supplement_groups(base: dict[str, list[dict]], extra: dict[str, list[dict]], limit_per_bucket: int = 6):
    merged = empty_ticket_groups()
    for bucket_name in merged:
        merged[bucket_name] = list(base.get(bucket_name, []))
        existing = {record_signature(item) for item in merged[bucket_name]}
        for item in extra.get(bucket_name, []):
            signature = record_signature(item)
            if signature in existing:
                continue
            existing.add(signature)
            merged[bucket_name].append(item)
            if len(merged[bucket_name]) >= limit_per_bucket:
                break
    return sort_grouped(dedupe_grouped(merged), limit=limit_per_bucket)


def reverse_mirrored_groups(groups: dict[str, list[dict]], origin: str, destination: str, date: str):
    mirrored = empty_ticket_groups()
    for bucket_name, items in groups.items():
        for item in items:
            cloned = dict(item)
            cloned["origin"] = origin
            cloned["destination"] = destination
            cloned["tanggal"] = date
            summary = str(item.get("airline_summary") or "Estimasi simetris")
            cloned["airline_summary"] = f"{summary} | estimasi rute pulang"
            mirrored[bucket_name].append(cloned)
    return sort_grouped(dedupe_grouped(mirrored), limit=6)


def cheapest_price(groups: dict[str, list[dict]], bucket_name: str):
    items = groups.get(bucket_name) or []
    if not items:
        return None
    return min(int(item.get("price_idr") or item.get("harga_total") or 0) for item in items if int(item.get("price_idr") or item.get("harga_total") or 0) > 0)


def bucket_multiplier(target_bucket: str, source_bucket: str):
    multipliers = {
        ("direct", "one_stop"): 1.18,
        ("direct", "two_stop"): 1.28,
        ("one_stop", "direct"): 0.86,
        ("one_stop", "two_stop"): 1.10,
        ("two_stop", "direct"): 0.76,
        ("two_stop", "one_stop"): 0.91,
    }
    return multipliers.get((target_bucket, source_bucket), 1.0)


def global_destination_baselines(destination: str, ym: str):
    baselines: dict[str, int] = {}

    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            for table in ("tiket_pp_harian", "tiket_pp_cache"):
                cur.execute(
                    f"""
                    SELECT bucket, num_stops_out, MIN({sql_price_expr()}) AS price_idr
                    FROM {table}
                    WHERE destination = %s
                      AND {sql_price_expr()} >= 1000000
                    GROUP BY bucket, num_stops_out
                    ORDER BY price_idr ASC
                    """,
                    (destination,),
                )
                for row in cur.fetchall():
                    bucket_name = normalize_bucket_value(row.get("bucket"), row.get("num_stops_out"))
                    if bucket_name not in baselines and int(row.get("price_idr") or 0) > 0:
                        baselines[bucket_name] = normalize_estimated_price(row["price_idr"], bucket_name)

    with get_mysql_connection(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT destination, bucket, projected_month, projected_price_idr
                FROM ticket_price_projections
                WHERE destination = %s
                ORDER BY ABS(PERIOD_DIFF(REPLACE(projected_month, '-', ''), REPLACE(%s, '-', ''))) ASC, projected_price_idr ASC
                """,
                (destination, ym),
            )
            for row in cur.fetchall():
                bucket_name = normalize_bucket_value(row.get("bucket"))
                if bucket_name not in baselines and int(row.get("projected_price_idr") or 0) > 0:
                    baselines[bucket_name] = normalize_estimated_price(row["projected_price_idr"], bucket_name)

            cur.execute(
                """
                SELECT destination, bucket, `year_month` AS ym_key, price_min_idr
                FROM ticket_price_monthly_stats
                WHERE destination = %s
                ORDER BY ABS(PERIOD_DIFF(REPLACE(`year_month`, '-', ''), REPLACE(%s, '-', ''))) ASC, price_min_idr ASC
                """,
                (destination, ym),
            )
            for row in cur.fetchall():
                bucket_name = normalize_bucket_value(row.get("bucket"))
                if bucket_name not in baselines and int(row.get("price_min_idr") or 0) > 0:
                    baselines[bucket_name] = normalize_estimated_price(row["price_min_idr"], bucket_name)
    return baselines


def fill_missing_bucket_estimates(groups: dict[str, list[dict]], origin: str, destination: str, ym: str, date_hint: str, note: str = "Estimasi internal"):
    filled = empty_ticket_groups()
    for bucket_name in filled:
        filled[bucket_name] = list(groups.get(bucket_name, []))

    baselines = global_destination_baselines(destination, ym)

    for target_bucket in ("direct", "one_stop", "two_stop"):
        if target_bucket == "direct" and not allow_direct_route(origin, destination):
            continue
        if filled[target_bucket]:
            continue

        price = baselines.get(target_bucket)
        summary = f"{note} ({target_bucket.replace('_', ' ')})"

        if not price:
            for source_bucket in ("one_stop", "direct", "two_stop"):
                source_price = cheapest_price(filled, source_bucket) or baselines.get(source_bucket)
                if source_price:
                    price = int(round(source_price * bucket_multiplier(target_bucket, source_bucket)))
                    summary = f"{note} dari {source_bucket.replace('_', ' ')}"
                    break

        if not price:
            continue

        price = max(price, estimate_floor(target_bucket))

        filled[target_bucket].append(
            {
                "origin": origin,
                "destination": destination,
                "tanggal": date_hint,
                "harga_total": price,
                "price_idr": price,
                "airline_summary": summary,
            }
        )

    return sort_grouped(dedupe_grouped(filled), limit=6)


def route_month_candidates(origin: str, destination: str, ym: str, date_hint: str):
    groups = empty_ticket_groups()
    date_hint = date_hint or f"{ym}-15"

    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            for table in ("tiket_pp_harian", "tiket_pp_cache"):
                cur.execute(
                    f"""
                    SELECT origin, destination, bucket, num_stops_out, DATE_FORMAT(tgl_berangkat, '%%Y-%%m-%%d') AS flight_date,
                           {sql_price_expr()} AS price_idr, airline_summary, detail_berangkat
                    FROM {table}
                    WHERE origin = %s
                      AND destination = %s
                      AND DATE_FORMAT(tgl_berangkat, '%%Y-%%m') = %s
                    ORDER BY ABS(DATEDIFF(tgl_berangkat, %s)) ASC, {sql_price_expr()} ASC
                    """,
                    (origin, destination, ym, date_hint),
                )
                rows = cur.fetchall()
                for row in rows:
                    record = {
                        "origin": row["origin"],
                        "destination": row["destination"],
                        "tanggal": str(row["flight_date"]),
                        "harga_total": int(row["price_idr"] or 0),
                        "price_idr": int(row["price_idr"] or 0),
                        "airline_summary": row.get("airline_summary") or "Data legacy lokal",
                        "detail_berangkat": row.get("detail_berangkat"),
                    }
                    append_group(groups, record, row.get("bucket"), row.get("num_stops_out"))
                groups = sort_grouped(dedupe_grouped(groups), limit=3)

    raw_month = build_monthly_from_raw(origin, ym)
    filtered_raw = empty_ticket_groups()
    for bucket_name, items in raw_month.items():
        filtered_raw[bucket_name] = [item for item in items if item.get("destination") == destination]
    groups = supplement_groups(groups, filtered_raw, limit_per_bucket=3)

    projection_candidates = empty_ticket_groups()
    stats_candidates = empty_ticket_groups()
    with get_mysql_connection(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT origin, destination, bucket, projected_month, projected_price_idr
                FROM ticket_price_projections
                WHERE origin = %s AND destination = %s
                """,
                (origin, destination),
            )
            projection_rows = cur.fetchall()
            best_by_bucket: dict[str, dict] = {}
            for row in projection_rows:
                bucket_name = normalize_bucket_value(row.get("bucket"))
                current = best_by_bucket.get(bucket_name)
                if current is None or year_month_distance(str(row["projected_month"]), ym) < year_month_distance(str(current["projected_month"]), ym):
                    best_by_bucket[bucket_name] = row

            for bucket_name, row in best_by_bucket.items():
                projection_candidates[bucket_name].append(
                    {
                        "origin": row["origin"],
                        "destination": row["destination"],
                        "tanggal": f"{ym}-15",
                        "harga_total": normalize_estimated_price(row["projected_price_idr"], bucket_name),
                        "price_idr": normalize_estimated_price(row["projected_price_idr"], bucket_name),
                        "airline_summary": f"Estimasi trend lokal ({row['projected_month']})",
                    }
                )

            cur.execute(
                """
                SELECT origin, destination, bucket, `year_month` AS ym_key, price_min_idr
                FROM ticket_price_monthly_stats
                WHERE origin = %s AND destination = %s
                """,
                (origin, destination),
            )
            stats_rows = cur.fetchall()
            best_stats_by_bucket: dict[str, dict] = {}
            for row in stats_rows:
                bucket_name = normalize_bucket_value(row.get("bucket"))
                current = best_stats_by_bucket.get(bucket_name)
                if current is None or year_month_distance(str(row["ym_key"]), ym) < year_month_distance(str(current["ym_key"]), ym):
                    best_stats_by_bucket[bucket_name] = row

            for bucket_name, row in best_stats_by_bucket.items():
                stats_candidates[bucket_name].append(
                    {
                        "origin": row["origin"],
                        "destination": row["destination"],
                        "tanggal": f"{ym}-15",
                        "harga_total": normalize_estimated_price(row["price_min_idr"], bucket_name),
                        "price_idr": normalize_estimated_price(row["price_min_idr"], bucket_name),
                        "airline_summary": f"Statistik historis ({row['ym_key']})",
                    }
                )

    groups = supplement_groups(groups, projection_candidates, limit_per_bucket=3)
    groups = supplement_groups(groups, stats_candidates, limit_per_bucket=3)
    return strip_direct_if_needed(
        fill_missing_bucket_estimates(groups, origin, destination, ym, date_hint, note="Estimasi internal"),
        origin,
        destination,
    )


def read_existing_day_records(origin: str, destination: str, date: str):
    groups = empty_ticket_groups()
    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            for table in ("tiket_pp_harian", "tiket_pp_cache"):
                cur.execute(
                    f"""
                    SELECT origin, destination, bucket, num_stops_out, tgl_berangkat, {sql_price_expr()} AS price_idr, airline_summary, detail_berangkat
                    FROM {table}
                    WHERE origin = %s AND destination = %s AND tgl_berangkat = %s
                    ORDER BY {sql_price_expr()} ASC
                    """,
                    (origin, destination, date),
                )
                rows = cur.fetchall()
                for row in rows:
                    record = {
                        "origin": row["origin"],
                        "destination": row["destination"],
                        "tanggal": str(row["tgl_berangkat"]),
                        "harga_total": int(row["price_idr"] or 0),
                        "price_idr": int(row["price_idr"] or 0),
                        "airline_summary": row.get("airline_summary") or "Data legacy lokal",
                        "detail_berangkat": row.get("detail_berangkat"),
                    }
                    append_group(groups, record, row.get("bucket"), row.get("num_stops_out"))
                if sum(len(groups[key]) for key in groups):
                    return sort_grouped(dedupe_grouped(groups), limit=6)
    return sort_grouped(dedupe_grouped(groups), limit=6)


def write_internal_cache(records: list[dict]):
    if not records:
        return
    unique_records = []
    seen = set()
    for item in records:
        signature = record_signature(item)
        if signature in seen:
            continue
        seen.add(signature)
        unique_records.append(item)
    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            insert_sql = """
                INSERT INTO tiket_pp_cache
                (origin, destination, bucket, tgl_berangkat, harga_total, currency, price_idr, harga_depart_est, harga_return_est, airline_summary, num_stops_out, detail_berangkat, tgl_crawled)
                VALUES (%s, %s, %s, %s, %s, 'IDR', %s, %s, 0, %s, %s, %s, NOW())
            """
            for item in unique_records:
                cur.execute(
                    insert_sql,
                    (
                        item["origin"],
                        item["destination"],
                        item.get("bucket"),
                        item["tanggal"],
                        item["price_idr"],
                        item["price_idr"],
                        item["price_idr"],
                        item.get("airline_summary"),
                        item.get("num_stops_out", 0),
                        json.dumps(
                            {
                                "summary": item.get("airline_summary"),
                                "segments": item.get("segments", []),
                                "price_idr": item.get("price_idr"),
                            },
                            ensure_ascii=False,
                        ),
                    ),
                )


def build_raw_groups_for_date(origin: str, destination: str, date: str):
    groups = empty_ticket_groups()
    raw_records_to_cache: list[dict] = []

    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT step, origin, destination, depart_date, dep_time_first, price_total, currency, carriers
                FROM tiket_raw_segments
                WHERE depart_date = %s
                ORDER BY price_total ASC
                """,
                (date,),
            )
            rows = cur.fetchall()

    direct_rows = [row for row in rows if row["origin"] == origin and row["destination"] == destination and row["step"] in ("DIR_JED", "DIR_MED")]
    prebuilt_one_stop = [row for row in rows if row["origin"] == origin and row["destination"] == destination and row["step"] in ("OJ_JED", "OJ_MED")]
    start_one = [row for row in rows if row["origin"] == origin and row["step"] == "T1_T2"]
    start_two = [row for row in rows if row["origin"] == origin and row["step"] == "ORIGIN_T1"]
    final_rows = [row for row in rows if row["destination"] == destination and row["step"] in ("T2_JED", "T2_MED")]
    mid_rows = [row for row in rows if row["step"] == "T1_T2"]

    for row in direct_rows[:6]:
        record = build_record("direct", row, [row])
        groups["direct"].append(record)
        raw_records_to_cache.append(record)

    for row in prebuilt_one_stop[:6]:
        record = build_record("one_stop", row, [row])
        groups["one_stop"].append(record)
        raw_records_to_cache.append(record)

    finals_by_origin: dict[str, list[dict]] = defaultdict(list)
    mid_by_origin: dict[str, list[dict]] = defaultdict(list)
    for row in final_rows:
        finals_by_origin[str(row["origin"])].append(row)
    for row in mid_rows:
        mid_by_origin[str(row["origin"])].append(row)

    one_seen = set()
    for first_leg in start_one[:80]:
        for final_leg in finals_by_origin.get(str(first_leg["destination"]), [])[:20]:
            key = (first_leg["destination"], final_leg["destination"], first_leg["dep_time_first"], final_leg["dep_time_first"])
            if key in one_seen:
                continue
            one_seen.add(key)
            record = build_record("one_stop", final_leg, [first_leg, final_leg])
            groups["one_stop"].append(record)
            raw_records_to_cache.append(record)

    two_seen = set()
    for leg_a in start_two[:60]:
        for leg_b in mid_by_origin.get(str(leg_a["destination"]), [])[:15]:
            for final_leg in finals_by_origin.get(str(leg_b["destination"]), [])[:10]:
                key = (
                    leg_a["destination"],
                    leg_b["destination"],
                    final_leg["destination"],
                    leg_a["dep_time_first"],
                    leg_b["dep_time_first"],
                    final_leg["dep_time_first"],
                )
                if key in two_seen:
                    continue
                two_seen.add(key)
                record = build_record("two_stop", final_leg, [leg_a, leg_b, final_leg])
                groups["two_stop"].append(record)
                raw_records_to_cache.append(record)

    # Origin besar seperti CGK bisa punya 2 transit dari pola T1_T2 -> T1_T2 -> T2_DEST.
    for leg_a in start_one[:60]:
        for leg_b in mid_by_origin.get(str(leg_a["destination"]), [])[:15]:
            if str(leg_b["destination"]) in {str(leg_a["origin"]), str(leg_a["destination"])}:
                continue
            for final_leg in finals_by_origin.get(str(leg_b["destination"]), [])[:10]:
                key = (
                    leg_a["origin"],
                    leg_a["destination"],
                    leg_b["destination"],
                    final_leg["destination"],
                    leg_a["dep_time_first"],
                    leg_b["dep_time_first"],
                    final_leg["dep_time_first"],
                )
                if key in two_seen:
                    continue
                two_seen.add(key)
                record = build_record("two_stop", final_leg, [leg_a, leg_b, final_leg])
                groups["two_stop"].append(record)
                raw_records_to_cache.append(record)

    groups = sort_grouped(dedupe_grouped(groups), limit=6)
    if sum(len(groups[key]) for key in groups):
        write_internal_cache(raw_records_to_cache[:18])
    return groups


def build_monthly_from_raw(origin: str, ym: str):
    grouped_best: dict[tuple[str, str], dict] = {}
    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT DATE_FORMAT(depart_date, '%%Y-%%m-%%d') AS flight_date
                FROM tiket_raw_segments
                WHERE origin = %s AND DATE_FORMAT(depart_date, '%%Y-%%m') = %s
                ORDER BY flight_date
                """,
                (origin, ym),
            )
            dates = [row["flight_date"] for row in cur.fetchall()]

    for flight_date in dates:
        for destination in ("JED", "MED"):
            day_groups = build_raw_groups_for_date(origin, destination, flight_date)
            for bucket_name in ("direct", "one_stop", "two_stop"):
                if not day_groups[bucket_name]:
                    continue
                best = day_groups[bucket_name][0]
                key = (destination, bucket_name)
                current = grouped_best.get(key)
                if current is None or int(best["price_idr"]) < int(current["price_idr"]):
                    grouped_best[key] = best

    groups = empty_ticket_groups()
    for (_, bucket_name), record in grouped_best.items():
        groups[bucket_name].append(record)
    return sort_grouped(dedupe_grouped(groups), limit=6)


def recommendation_text(groups: dict[str, list[dict]], destination: str):
    ranked = []
    for bucket_name, items in groups.items():
        for item in items:
            penalty = {"direct": 0, "one_stop": 350000, "two_stop": 850000}[bucket_name]
            ranked.append((int(item["price_idr"]) + penalty, bucket_name, item))
    ranked.sort(key=lambda row: row[0])
    if not ranked:
        return {
            "summary": f"Belum ada tiket internal yang layak direkomendasikan untuk rute ke {destination}.",
            "best_option": None,
        }
    _, bucket_name, best = ranked[0]

    return {
        "summary": f"Rekomendasi awal: pilih opsi {bucket_name.replace('_', ' ')} ke {destination} dengan estimasi {best['price_idr']:,} IDR karena saat ini paling efisien dari data internal.",
        "best_option": best,
    }


@router.get("/health")
def ticket_pricing_health():
    return {
        "status": "ok",
        "databases": {
            "legacy": LEGACY_DB,
            "analytics": ANALYTICS_DB,
            "app": APP_DB,
        },
    }


@router.get("/by-date")
def get_tickets_by_date(
    origin: str = Query(...),
    destination: str = Query(...),
    date: str = Query(...),
    refresh_live: bool = Query(default=False),
):
    live_meta = {"provider": None, "attempts": []}
    groups = None
    source = "internal-db"

    if refresh_live:
        groups, live_meta = fetch_live_date_groups(origin, destination, date)
        if groups:
            source = f"live:{live_meta['provider']}"

    if groups is None:
        groups = read_existing_day_records(origin, destination, date)
    raw_groups = build_raw_groups_for_date(origin, destination, date)
    groups = supplement_groups(groups, raw_groups, limit_per_bucket=6)

    groups = fill_missing_bucket_estimates(groups, origin, destination, date[:7], date, note="Estimasi tanggal")
    groups = enrich_group_records(groups, "go")

    return {
        "ok": True,
        "source": source,
        "meta": {
            "origin": origin,
            "destination": destination,
            "date": date,
            "refresh_live": refresh_live,
            "live": live_meta,
        },
        "direct": groups["direct"],
        "onestop": groups["one_stop"],
        "twostop": groups["two_stop"],
    }


@router.get("/cheapest")
def get_tickets_cheapest(
    origin: str = Query(...),
    ym: str = Query(...),
    limit: int = Query(default=120),
):
    outbound = empty_ticket_groups()
    inbound = empty_ticket_groups()

    with get_mysql_connection(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            for table in ("tiket_pp_harian", "tiket_pp_cache"):
                cur.execute(
                    f"""
                    SELECT origin, destination, bucket, num_stops_out, MIN({sql_price_expr()}) AS price_idr
                    FROM {table}
                    WHERE origin = %s AND DATE_FORMAT(tgl_berangkat, '%%Y-%%m') = %s
                    GROUP BY origin, destination, bucket, num_stops_out
                    ORDER BY price_idr ASC
                    """,
                    (origin, ym),
                )
                rows = cur.fetchall()
                for row in rows:
                    record = {
                        "origin": row["origin"],
                        "destination": row["destination"],
                        "tanggal": f"{ym}-15",
                        "harga_total": int(row["price_idr"] or 0),
                        "price_idr": int(row["price_idr"] or 0),
                        "airline_summary": "Data legacy lokal",
                    }
                    append_group(outbound, record, row.get("bucket"), row.get("num_stops_out"))
                if sum(len(outbound[key]) for key in outbound):
                    break

    raw_groups = build_monthly_from_raw(origin, ym)
    for bucket_name in outbound:
        existing_keys = {(item["destination"], item["tanggal"]) for item in outbound[bucket_name]}
        for item in raw_groups[bucket_name]:
            if (item["destination"], item["tanggal"]) not in existing_keys:
                outbound[bucket_name].append(item)
    outbound = sort_grouped(dedupe_grouped(outbound), limit=min(limit, 6))

    projected_outbound, projected_inbound = synthesize_projection_rows(origin, ym)
    for bucket_name in outbound:
        existing_destinations = {item["destination"] for item in outbound[bucket_name]}
        for item in projected_outbound[bucket_name]:
            if item["destination"] not in existing_destinations:
                outbound[bucket_name].append(item)
    for destination in ("JED", "MED"):
        outbound = supplement_groups(outbound, route_month_candidates(origin, destination, ym, f"{ym}-15"), limit_per_bucket=min(limit, 6))
    outbound = sort_grouped(dedupe_grouped(outbound), limit=min(limit, 6))
    outbound = strip_direct_if_needed(outbound, origin, "JED")
    outbound = enrich_group_records(outbound, "go")

    for back_origin in ("JED", "MED"):
        route_groups = route_month_candidates(back_origin, origin, ym, f"{ym}-15")
        if sum(len(route_groups[key]) for key in route_groups) == 0:
            mirrored = reverse_mirrored_groups(route_month_candidates(origin, back_origin, ym, f"{ym}-15"), back_origin, origin, f"{ym}-15")
            route_groups = supplement_groups(route_groups, mirrored, limit_per_bucket=3)
        inbound = supplement_groups(inbound, route_groups, limit_per_bucket=min(limit, 6))

    inbound = supplement_groups(inbound, projected_inbound, limit_per_bucket=min(limit, 6))
    inbound = sort_grouped(dedupe_grouped(inbound), limit=min(limit, 6))
    inbound = strip_direct_if_needed(inbound, "JED", origin)
    inbound = enrich_group_records(inbound, "return")

    return {
        "ok": True,
        "origin": origin,
        "month": ym,
        "months": 1,
        "range": [f"{ym}-01", f"{ym}-31"],
        "outbound": outbound,
        "inbound": inbound,
        "source": "internal-db",
    }


@router.get("/recommendation")
def get_ticket_recommendation(
    origin: str = Query(...),
    destination: str = Query(...),
    date: str = Query(...),
):
    day_result = get_tickets_by_date(origin=origin, destination=destination, date=date)
    groups = {
        "direct": day_result["direct"],
        "one_stop": day_result["onestop"],
        "two_stop": day_result["twostop"],
    }
    recommendation = recommendation_text(groups, destination)
    return {
        "ok": True,
        "source": "internal-heuristic",
        "meta": {"origin": origin, "destination": destination, "date": date},
        **recommendation,
    }


@router.post("/activity")
async def post_ticket_activity(request: FastAPIRequest):
    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payload activity tidak valid: {exc}")

    user_id = body.get("user_id")
    aktivitas = body.get("aktivitas") or body.get("activity") or "visit:tiket"
    ip_address = body.get("ip") or body.get("ip_address") or ""
    lokasi = body.get("lokasi") or body.get("location") or ""
    extra = " | ".join(
        filter(
            None,
            [
                body.get("sid"),
                body.get("feature"),
                body.get("page_code"),
                body.get("origin"),
                body.get("destination"),
            ],
        )
    )
    if extra:
        aktivitas = f"{aktivitas} | {extra}"

    with get_mysql_connection(APP_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO log_aktivitas (user_id, ip_address, lokasi, aktivitas)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, ip_address, lokasi, aktivitas),
            )

    return {"ok": True}
