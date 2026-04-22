import argparse
import math
import statistics
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from typing import DefaultDict, Iterable

import pymysql


LEGACY_DB = "umroh_legacy_local"
ANALYTICS_DB = "umroh_ticket_analytics"
MYSQL_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "UmrohIktikaf#2026",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
}


@dataclass
class MonthlyPoint:
    source_db: str
    origin: str
    destination: str
    bucket: str
    year_month: str
    prices: list[int]


def connect(database: str):
    config = dict(MYSQL_CONFIG)
    config["database"] = database
    return pymysql.connect(**config)


def normalize_bucket(raw_bucket: str | None) -> str:
    value = str(raw_bucket or "").strip().lower().replace("_", "").replace(" ", "")
    if value in {"direct", "0stop", "0stops"}:
        return "direct"
    if value in {"1stop", "onestop", "1stops"}:
        return "1stop"
    if value in {"2stop", "twostop", "2stops"}:
        return "2stop"
    return "other"


def bucket_from_stops(num_stops: int | None) -> str:
    if num_stops is None:
        return "other"
    if int(num_stops) <= 0:
        return "direct"
    if int(num_stops) == 1:
        return "1stop"
    return "2stop"


def ym_of(value: date | datetime | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m")
    if isinstance(value, date):
        return value.strftime("%Y-%m")
    text = str(value).strip()
    if len(text) >= 7:
        return text[:7]
    return None


def median_int(values: list[int]) -> int:
    if not values:
        return 0
    return int(round(statistics.median(values)))


def avg_int(values: list[int]) -> int:
    if not values:
        return 0
    return int(round(sum(values) / len(values)))


def load_points_from_cache() -> Iterable[tuple[str, str, str, str, int]]:
    with connect(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT origin, destination, bucket, num_stops_out, tgl_berangkat, COALESCE(NULLIF(price_idr, 0), NULLIF(harga_total, 0)) AS price_idr
                FROM tiket_pp_cache
                WHERE COALESCE(NULLIF(price_idr, 0), NULLIF(harga_total, 0)) IS NOT NULL
                """
            )
            for row in cur.fetchall():
                month = ym_of(row["tgl_berangkat"])
                if not month:
                    continue
                bucket = normalize_bucket(row["bucket"])
                if bucket == "other":
                    bucket = bucket_from_stops(row.get("num_stops_out"))
                if bucket == "other":
                    continue
                yield (
                    str(row["origin"] or "").upper(),
                    str(row["destination"] or "").upper(),
                    bucket,
                    month,
                    int(row["price_idr"] or 0),
                )


def load_points_from_harian() -> Iterable[tuple[str, str, str, str, int]]:
    with connect(LEGACY_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT origin, destination, bucket, tgl_berangkat, COALESCE(NULLIF(price_idr, 0), NULLIF(harga_total, 0)) AS price_idr
                FROM tiket_pp_harian
                WHERE COALESCE(NULLIF(price_idr, 0), NULLIF(harga_total, 0)) IS NOT NULL
                """
            )
            for row in cur.fetchall():
                month = ym_of(row["tgl_berangkat"])
                if not month:
                    continue
                bucket = normalize_bucket(row["bucket"])
                if bucket == "other":
                    continue
                yield (
                    str(row["origin"] or "").upper(),
                    str(row["destination"] or "").upper(),
                    bucket,
                    month,
                    int(row["price_idr"] or 0),
                )


def build_monthly_stats() -> list[MonthlyPoint]:
    grouped: DefaultDict[tuple[str, str, str, str], list[int]] = defaultdict(list)
    for origin, destination, bucket, month, price in list(load_points_from_cache()) + list(load_points_from_harian()):
        if not origin or not destination or price <= 0:
            continue
        grouped[(origin, destination, bucket, month)].append(price)

    return [
        MonthlyPoint(
            source_db=LEGACY_DB,
            origin=origin,
            destination=destination,
            bucket=bucket,
            year_month=month,
            prices=sorted(prices),
        )
        for (origin, destination, bucket, month), prices in grouped.items()
    ]


def upsert_monthly_stats(points: list[MonthlyPoint]):
    sql = """
        INSERT INTO ticket_price_monthly_stats
        (source_db, origin, destination, bucket, `year_month`, sample_count, price_min_idr, price_avg_idr, price_median_idr, price_max_idr)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
          sample_count = VALUES(sample_count),
          price_min_idr = VALUES(price_min_idr),
          price_avg_idr = VALUES(price_avg_idr),
          price_median_idr = VALUES(price_median_idr),
          price_max_idr = VALUES(price_max_idr)
    """
    with connect(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            for point in points:
                cur.execute(
                    sql,
                    (
                        point.source_db,
                        point.origin,
                        point.destination,
                        point.bucket,
                        point.year_month,
                        len(point.prices),
                        min(point.prices),
                        avg_int(point.prices),
                        median_int(point.prices),
                        max(point.prices),
                    ),
                )


def add_months(year_month: str, delta: int) -> str:
    year, month = map(int, year_month.split("-"))
    month_index = (year * 12 + (month - 1)) + delta
    next_year = month_index // 12
    next_month = (month_index % 12) + 1
    return f"{next_year:04d}-{next_month:02d}"


def month_distance(base: str, current: str) -> int:
    by, bm = map(int, base.split("-"))
    cy, cm = map(int, current.split("-"))
    return (cy * 12 + cm) - (by * 12 + bm)


def linear_projection(months: list[str], values: list[int], target_month: str) -> tuple[int, int]:
    if len(months) == 1:
        return values[0], 0

    base = months[0]
    xs = [month_distance(base, month) for month in months]
    ys = values
    x_mean = sum(xs) / len(xs)
    y_mean = sum(ys) / len(ys)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    denominator = sum((x - x_mean) ** 2 for x in xs)
    slope = 0 if denominator == 0 else numerator / denominator
    intercept = y_mean - slope * x_mean
    target_x = month_distance(base, target_month)
    projection = intercept + slope * target_x
    return max(0, int(round(projection))), int(round(slope))


def build_projections(latest_month: str, through_month: str):
    with connect(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT source_db, origin, destination, bucket, `year_month`, sample_count, price_avg_idr, price_median_idr
                FROM ticket_price_monthly_stats
                ORDER BY origin, destination, bucket, `year_month`
                """
            )
            rows = cur.fetchall()

    grouped: DefaultDict[tuple[str, str, str, str], list[dict]] = defaultdict(list)
    for row in rows:
        grouped[(row["source_db"], row["origin"], row["destination"], row["bucket"])].append(row)

    targets = []
    end_distance = month_distance(latest_month, through_month)
    projection_months = [add_months(latest_month, step) for step in range(1, end_distance + 1)]

    for (source_db, origin, destination, bucket), history in grouped.items():
        months = [row["year_month"] for row in history]
        medians = [int(row["price_median_idr"] or 0) for row in history]
        baseline = medians[-1]
        for target_month in projection_months:
            projected, slope = linear_projection(months, medians, target_month)
            confidence = min(0.9, max(0.2, len(history) / 12))
            if len(history) < 3:
                seasonal_factor = 1.0
                if target_month.endswith("-05") or target_month.endswith("-06"):
                    seasonal_factor = 1.08
                projected = int(round(baseline * seasonal_factor))
                slope = projected - baseline
            targets.append(
                (
                    source_db,
                    origin,
                    destination,
                    bucket,
                    target_month,
                    projected,
                    baseline,
                    slope,
                    "linear-regression" if len(history) >= 3 else "seasonal-baseline",
                    round(confidence, 2),
                    len(history),
                )
            )

    sql = """
        INSERT INTO ticket_price_projections
        (source_db, origin, destination, bucket, projected_month, projected_price_idr, baseline_price_idr, trend_slope_idr, method, confidence_score, history_months)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
          projected_price_idr = VALUES(projected_price_idr),
          baseline_price_idr = VALUES(baseline_price_idr),
          trend_slope_idr = VALUES(trend_slope_idr),
          method = VALUES(method),
          confidence_score = VALUES(confidence_score),
          history_months = VALUES(history_months)
    """
    with connect(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            for row in targets:
                cur.execute(sql, row)


def latest_history_month() -> str:
    with connect(ANALYTICS_DB) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(`year_month`) AS latest_month FROM ticket_price_monthly_stats")
            row = cur.fetchone()
            latest = row["latest_month"] if row else None
    if latest:
        return str(latest)
    return datetime.now().strftime("%Y-%m")


def run_once(through_month: str):
    points = build_monthly_stats()
    upsert_monthly_stats(points)
    latest_month = latest_history_month()
    build_projections(latest_month, through_month)
    print(
        f"ticket analytics updated: {len(points)} monthly points, latest={latest_month}, projected_through={through_month}"
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Build monthly ticket trends and projections from legacy MUWAHID data.")
    parser.add_argument("--through", default="2026-06", help="Projection limit in YYYY-MM format. Default: 2026-06")
    parser.add_argument("--daemon-minutes", type=int, default=0, help="If > 0, rerun in a loop every N minutes.")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.daemon_minutes and args.daemon_minutes > 0:
        while True:
            run_once(args.through)
            time.sleep(max(1, args.daemon_minutes) * 60)
    else:
        run_once(args.through)


if __name__ == "__main__":
    main()
