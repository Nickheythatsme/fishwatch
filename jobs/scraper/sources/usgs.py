"""USGS Water Services API client for gauge readings."""

from datetime import datetime, timezone

import httpx

from ...db import get_connection
from ..config import USGS_BASE_URL, USGS_PARAMS, USGS_STATIONS

# USGS parameter codes
PARAM_FLOW = "00060"
PARAM_GAUGE_HEIGHT = "00065"
PARAM_WATER_TEMP = "00010"


def fetch_gauge_data() -> list[dict]:
    """Fetch instantaneous values from USGS for all configured stations."""
    station_ids = ",".join(USGS_STATIONS.keys())
    params = {
        **USGS_PARAMS,
        "sites": station_ids,
        "period": "PT2H",  # Last 2 hours
    }

    client = httpx.Client(timeout=30)
    response = client.get(USGS_BASE_URL, params=params)
    response.raise_for_status()
    data = response.json()

    readings: dict[tuple[str, str], dict] = {}

    for ts in data.get("value", {}).get("timeSeries", []):
        site_code = ts["sourceInfo"]["siteCode"][0]["value"]
        param_code = ts["variable"]["variableCode"][0]["value"]
        slug = USGS_STATIONS.get(site_code)
        if not slug:
            continue

        for value_entry in ts.get("values", []):
            for v in value_entry.get("value", []):
                measured_at = v["dateTime"]
                val = float(v["value"]) if v["value"] else None

                key = (site_code, measured_at)
                if key not in readings:
                    readings[key] = {
                        "station_id": site_code,
                        "water_body_slug": slug,
                        "measured_at": measured_at,
                        "flow_cfs": None,
                        "gauge_height_ft": None,
                        "water_temp_f": None,
                        "fetched_at": datetime.now(timezone.utc).isoformat(),
                    }

                if param_code == PARAM_FLOW:
                    readings[key]["flow_cfs"] = val
                elif param_code == PARAM_GAUGE_HEIGHT:
                    readings[key]["gauge_height_ft"] = val
                elif param_code == PARAM_WATER_TEMP:
                    # USGS reports in Celsius, convert to Fahrenheit
                    readings[key]["water_temp_f"] = (
                        val * 9 / 5 + 32 if val is not None else None
                    )

    return list(readings.values())


def save_gauge_readings(readings: list[dict]) -> int:
    """Save gauge readings to the database, resolving water_body_id from slug."""
    conn = get_connection()
    cur = conn.cursor()

    # Fetch water body IDs by slug
    cur.execute("SELECT id, slug FROM water_bodies")
    slug_to_id: dict[str, str] = {row[1]: str(row[0]) for row in cur.fetchall()}

    count = 0
    for r in readings:
        water_body_id = slug_to_id.get(r["water_body_slug"])
        if not water_body_id:
            continue

        cur.execute(
            """
            INSERT INTO gauge_readings (station_id, water_body_id, measured_at, flow_cfs, gauge_height_ft, water_temp_f, fetched_at)
            VALUES (%(station_id)s, %(water_body_id)s, %(measured_at)s, %(flow_cfs)s, %(gauge_height_ft)s, %(water_temp_f)s, %(fetched_at)s)
            ON CONFLICT (station_id, measured_at) DO NOTHING
            """,
            {
                "station_id": r["station_id"],
                "water_body_id": water_body_id,
                "measured_at": r["measured_at"],
                "flow_cfs": r["flow_cfs"],
                "gauge_height_ft": r["gauge_height_ft"],
                "water_temp_f": r["water_temp_f"],
                "fetched_at": r["fetched_at"],
            },
        )
        count += 1

    conn.commit()
    cur.close()
    conn.close()
    return count


if __name__ == "__main__":
    readings = fetch_gauge_data()
    count = save_gauge_readings(readings)
    print(f"Saved {count} gauge readings")
