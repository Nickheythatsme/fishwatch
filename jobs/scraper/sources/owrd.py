"""Oregon WRD (Water Resources Department) near-real-time gauge client.

Covers stations that USGS Water Services doesn't publish instantaneous data
for — e.g. the Crooked River below Bowman Dam tailwater (station 14080500).
"""

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx

from ..config import OWRD_BASE_URL, OWRD_STATIONS
from .usgs import save_gauge_readings

# OWRD timestamps are in Pacific local time
OWRD_TZ = ZoneInfo("America/Los_Angeles")


def parse_owrd_tsv(text: str, station_id: str, slug: str, fetched_at: str) -> list[dict]:
    """Parse OWRD instantaneous-flow TSV into gauge reading dicts.

    Expected row format (tab-separated, after a header line):
        station_nbr  record_date  instantaneous_flow_cfs  published_status  download_date
    """
    readings = []
    lines = text.strip().splitlines()

    for line in lines[1:]:  # Skip header
        fields = line.split("\t")
        if len(fields) < 3:
            continue

        record_date = fields[1].strip()
        flow_raw = fields[2].strip()
        if not flow_raw:
            continue

        try:
            flow = float(flow_raw)
            measured_local = datetime.strptime(record_date, "%m-%d-%Y %H:%M").replace(tzinfo=OWRD_TZ)
        except ValueError:
            continue

        readings.append(
            {
                "station_id": station_id,
                "water_body_slug": slug,
                "measured_at": measured_local.astimezone(UTC).isoformat(),
                "flow_cfs": flow,
                "gauge_height_ft": None,
                "water_temp_f": None,
                "fetched_at": fetched_at,
            }
        )

    return readings


def fetch_gauge_data() -> list[dict]:
    """Fetch instantaneous flow readings from OWRD for all configured stations."""
    now_local = datetime.now(OWRD_TZ)
    start_date = (now_local - timedelta(days=1)).strftime("%m/%d/%Y")
    end_date = now_local.strftime("%m/%d/%Y")
    fetched_at = datetime.now(UTC).isoformat()

    client = httpx.Client(timeout=30)
    readings: list[dict] = []

    for station_id, slug in OWRD_STATIONS.items():
        params = {
            "station_nbr": station_id,
            "start_date": start_date,
            "end_date": end_date,
            "dataset": "Instantaneous_Flow",
            "format": "tsv",
        }
        response = client.get(OWRD_BASE_URL, params=params)
        response.raise_for_status()
        readings.extend(parse_owrd_tsv(response.text, station_id, slug, fetched_at))

    return readings


if __name__ == "__main__":
    readings = fetch_gauge_data()
    count = save_gauge_readings(readings)
    print(f"Saved {count} OWRD gauge readings")
