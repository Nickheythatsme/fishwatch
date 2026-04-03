"""Entry point for the LLM extraction job.

Processes unprocessed raw reports through Claude to extract structured data.
"""

import json
import os

import anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from ..db import get_connection
from .parser import parse_extraction
from .prompt import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT

load_dotenv()


def run() -> None:
    conn = get_connection()
    cur = conn.cursor()
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Fetch unprocessed reports
    cur.execute(
        "SELECT id, source_name, raw_html FROM raw_reports WHERE is_processed = FALSE"
    )
    reports = [
        {"id": str(row[0]), "source_name": row[1], "raw_html": row[2]}
        for row in cur.fetchall()
    ]

    if not reports:
        print("No unprocessed reports found")
        conn.close()
        return

    # Load water body name → id mapping
    cur.execute("SELECT id, name, slug FROM water_bodies")
    name_to_id: dict[str, str] = {}
    for row in cur.fetchall():
        wb_id, name, slug = str(row[0]), row[1], row[2]
        name_to_id[name.lower()] = wb_id
        name_to_id[slug] = wb_id

    for report in reports:
        print(f"Processing {report['source_name']} ({report['id']})")

        # Extract text from HTML
        soup = BeautifulSoup(report["raw_html"], "html.parser")
        text = soup.get_text(separator="\n", strip=True)

        # Truncate if too long for the model
        if len(text) > 15000:
            text = text[:15000]

        prompt = EXTRACTION_USER_PROMPT.format(report_content=text)

        try:
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
                system=EXTRACTION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as e:
            print(f"  Claude API error: {e}")
            continue

        raw_json = response.content[0].text
        rows = parse_extraction(raw_json, report["id"], report["source_name"])

        for row in rows:
            # Resolve water_body_id from name
            wb_name = row.pop("_water_body_name", None)
            water_body_id = None
            if wb_name:
                water_body_id = name_to_id.get(wb_name.lower())

            cur.execute(
                """
                INSERT INTO parsed_reports
                    (raw_report_id, water_body_id, source_name, report_date, sentiment,
                     species_mentioned, fly_patterns_mentioned, conditions_summary,
                     flow_commentary, water_clarity, raw_extraction)
                VALUES (%(raw_report_id)s, %(water_body_id)s, %(source_name)s, %(report_date)s,
                        %(sentiment)s, %(species_mentioned)s, %(fly_patterns_mentioned)s,
                        %(conditions_summary)s, %(flow_commentary)s, %(water_clarity)s,
                        %(raw_extraction)s)
                """,
                {
                    "raw_report_id": row["raw_report_id"],
                    "water_body_id": water_body_id,
                    "source_name": row["source_name"],
                    "report_date": row.get("report_date"),
                    "sentiment": row.get("sentiment"),
                    "species_mentioned": row.get("species_mentioned", []),
                    "fly_patterns_mentioned": row.get("fly_patterns_mentioned", []),
                    "conditions_summary": row.get("conditions_summary"),
                    "flow_commentary": row.get("flow_commentary"),
                    "water_clarity": row.get("water_clarity"),
                    "raw_extraction": json.dumps(row.get("raw_extraction")),
                },
            )

        # Mark as processed
        cur.execute(
            "UPDATE raw_reports SET is_processed = TRUE WHERE id = %s",
            (report["id"],),
        )
        conn.commit()

        print(f"  Extracted {len(rows)} entries")

    cur.close()
    conn.close()


if __name__ == "__main__":
    run()
