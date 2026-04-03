"""Entry point for the signal scoring job.

Computes composite fishing signals for each water body.
"""

import os
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import create_client

from .composite import compute_composite
from .consensus import score_consensus
from .flow_score import score_flow
from .sentiment_score import score_sentiment

load_dotenv()


def run() -> None:
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )

    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()

    # Get all water bodies
    wb_result = supabase.table("water_bodies").select("id, slug, name").execute()
    water_bodies = wb_result.data or []

    for wb in water_bodies:
        wb_id = wb["id"]
        slug = wb["slug"]

        # Get latest flow reading
        gauge_result = (
            supabase.table("gauge_readings")
            .select("flow_cfs")
            .eq("water_body_id", wb_id)
            .order("measured_at", desc=True)
            .limit(1)
            .execute()
        )
        current_flow = (
            gauge_result.data[0]["flow_cfs"]
            if gauge_result.data
            else None
        )

        # Get recent reports (last 7 days)
        reports_result = (
            supabase.table("parsed_reports")
            .select("sentiment, source_name, species_mentioned, fly_patterns_mentioned")
            .eq("water_body_id", wb_id)
            .gte("report_date", week_ago)
            .execute()
        )
        recent_reports = reports_result.data or []

        # Compute sub-scores
        f_score = score_flow(slug, current_flow)
        s_score = score_sentiment(recent_reports)
        c_score = score_consensus(recent_reports)

        # Compute composite
        composite = compute_composite(f_score, s_score, c_score)

        # Aggregate recommended species and flies from reports
        species: set[str] = set()
        flies: set[str] = set()
        for r in recent_reports:
            for sp in r.get("species_mentioned", []):
                species.add(sp)
            for fl in r.get("fly_patterns_mentioned", []):
                flies.add(fl)

        # Build summary
        summary_parts = []
        if s_score is not None:
            sentiment_label = (
                "excellent" if s_score >= 8
                else "good" if s_score >= 6
                else "fair" if s_score >= 4
                else "poor"
            )
            summary_parts.append(f"Reports indicate {sentiment_label} conditions")
        if current_flow is not None:
            summary_parts.append(f"flow at {current_flow:.0f} cfs")
        summary = ". ".join(summary_parts) + "." if summary_parts else None

        # Upsert score for today
        score_row = {
            "water_body_id": wb_id,
            "score_date": today,
            "composite_score": composite,
            "flow_score": f_score,
            "sentiment_score": s_score,
            "consensus_score": c_score,
            "recommended_species": list(species),
            "recommended_flies": list(flies),
            "summary": summary,
            "components": {
                "flow_cfs": current_flow,
                "report_count": len(recent_reports),
            },
            "scored_at": datetime.now(timezone.utc).isoformat(),
        }

        supabase.table("water_scores").upsert(
            score_row, on_conflict="water_body_id,score_date"
        ).execute()

        print(f"{wb['name']}: {composite}/10 (flow={f_score}, sentiment={s_score}, consensus={c_score})")


if __name__ == "__main__":
    run()
