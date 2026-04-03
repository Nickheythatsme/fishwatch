"""Entry point for the LLM extraction job.

Processes unprocessed raw reports through Claude to extract structured data.
"""

import os

import anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

from .parser import parse_extraction
from .prompt import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT

load_dotenv()


def run() -> None:
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    # Fetch unprocessed reports
    result = supabase.table("raw_reports").select("*").eq("is_processed", False).execute()
    reports = result.data or []

    if not reports:
        print("No unprocessed reports found")
        return

    # Load water body name → id mapping
    wb_result = supabase.table("water_bodies").select("id, name, slug").execute()
    name_to_id: dict[str, str] = {}
    for wb in wb_result.data:
        name_lower = wb["name"].lower()
        name_to_id[name_lower] = wb["id"]
        name_to_id[wb["slug"]] = wb["id"]

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
            if wb_name:
                wb_name_lower = wb_name.lower()
                row["water_body_id"] = name_to_id.get(wb_name_lower)

            supabase.table("parsed_reports").insert(row).execute()

        # Mark as processed
        supabase.table("raw_reports").update({"is_processed": True}).eq(
            "id", report["id"]
        ).execute()

        print(f"  Extracted {len(rows)} entries")


if __name__ == "__main__":
    run()
