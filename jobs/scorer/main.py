"""Entry point for the signal scoring job.

Computes composite fishing signals for each water body.
"""

import json
import logging
import sys
from datetime import UTC, date, datetime, timedelta

from db import get_connection

from .composite import FLOW_ONLY_CAP, compute_composite, is_flow_only, is_flow_suspect
from .consensus import score_consensus
from .flow_score import score_flow
from .fly_ranking import build_alias_map, rank_flies
from .sentiment_score import score_sentiment

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# How far back to look for reports. Recency decay (sentiment_score.report_weight)
# means old reports contribute progressively less rather than counting at full
# weight right up to this cutoff.
REPORT_LOOKBACK_DAYS = 21


def run() -> int:
    conn = get_connection()
    cur = conn.cursor()
    failures = 0

    try:
        today = date.today()
        today_iso = today.isoformat()
        lookback_start = (today - timedelta(days=REPORT_LOOKBACK_DAYS)).isoformat()

        # Build fly alias map once for all water bodies
        alias_map = build_alias_map(cur)

        # Get all water bodies
        cur.execute("SELECT id, slug, name FROM water_bodies")
        water_bodies = [{"id": str(row[0]), "slug": row[1], "name": row[2]} for row in cur.fetchall()]

        for wb in water_bodies:
            try:
                cur.execute("SAVEPOINT score_wb")
                wb_id = wb["id"]
                slug = wb["slug"]

                # Get latest flow reading
                cur.execute(
                    """
                    SELECT flow_cfs FROM gauge_readings
                    WHERE water_body_id = %s
                    ORDER BY measured_at DESC LIMIT 1
                    """,
                    (wb_id,),
                )
                flow_row = cur.fetchone()
                current_flow = flow_row[0] if flow_row else None

                # Get recent reports within the lookback window. Future-dated
                # reports (bad extractions) are excluded.
                cur.execute(
                    """
                    SELECT sentiment, source_name, species_mentioned,
                           fly_patterns_mentioned, report_date
                    FROM parsed_reports
                    WHERE water_body_id = %s
                      AND report_date >= %s
                      AND report_date <= %s
                    """,
                    (wb_id, lookback_start, today_iso),
                )
                recent_reports = [
                    {
                        "sentiment": row[0],
                        "source_name": row[1],
                        "species_mentioned": row[2] or [],
                        "fly_patterns_mentioned": row[3] or [],
                        "report_date": row[4],
                    }
                    for row in cur.fetchall()
                ]

                # Compute sub-scores
                f_score = score_flow(slug, current_flow)
                s_score = score_sentiment(recent_reports, today)
                c_score = score_consensus(recent_reports, today)

                # Disagreement guard: distrust gauge data that contradicts strong reports
                flow_suspect = is_flow_suspect(f_score, s_score)
                if flow_suspect:
                    logger.warning(
                        f"{wb['name']}: flow score {f_score} contradicts strong reports "
                        f"(sentiment={s_score}); excluding flow from signal"
                    )
                    f_score = None

                # Compute composite
                composite = compute_composite(f_score, s_score, c_score)

                # Flow-only cap: favorable flows with no report evidence shouldn't
                # read as excellent conditions
                flow_only = is_flow_only(f_score, s_score, c_score)
                if flow_only and composite > FLOW_ONLY_CAP:
                    composite = FLOW_ONLY_CAP

                # Aggregate recommended species from reports
                species: set[str] = set()
                for r in recent_reports:
                    for sp in r.get("species_mentioned", []):
                        species.add(sp)

                # Rank and cap fly recommendations
                ranked_flies = rank_flies(recent_reports, alias_map)

                # Build summary
                summary_parts = []
                if s_score is not None:
                    sentiment_label = (
                        "excellent" if s_score >= 8 else "good" if s_score >= 6 else "fair" if s_score >= 4 else "poor"
                    )
                    summary_parts.append(f"Reports indicate {sentiment_label} conditions")
                elif flow_only:
                    summary_parts.append("No recent shop reports")
                if current_flow is not None:
                    if flow_suspect:
                        summary_parts.append("gauge reading excluded (conflicts with reports)")
                    else:
                        summary_parts.append(f"flow at {current_flow:.0f} cfs")
                summary = ". ".join(summary_parts) + "." if summary_parts else None

                # Upsert score for today
                cur.execute(
                    """
                    INSERT INTO water_scores
                        (water_body_id, score_date, composite_score, flow_score, sentiment_score,
                         consensus_score, recommended_species, recommended_flies, summary, components, scored_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (water_body_id, score_date)
                    DO UPDATE SET
                        composite_score = EXCLUDED.composite_score,
                        flow_score = EXCLUDED.flow_score,
                        sentiment_score = EXCLUDED.sentiment_score,
                        consensus_score = EXCLUDED.consensus_score,
                        recommended_species = EXCLUDED.recommended_species,
                        recommended_flies = EXCLUDED.recommended_flies,
                        summary = EXCLUDED.summary,
                        components = EXCLUDED.components,
                        scored_at = EXCLUDED.scored_at
                    """,
                    (
                        wb_id,
                        today_iso,
                        composite,
                        f_score,
                        s_score,
                        c_score,
                        list(species),
                        ranked_flies,
                        summary,
                        json.dumps(
                            {
                                "flow_cfs": current_flow,
                                "report_count": len(recent_reports),
                                "flow_suspect": flow_suspect,
                                "flow_only": flow_only,
                            }
                        ),
                        datetime.now(UTC).isoformat(),
                    ),
                )

                cur.execute("RELEASE SAVEPOINT score_wb")
                logger.info(f"{wb['name']}: {composite}/10 (flow={f_score}, sentiment={s_score}, consensus={c_score})")
            except Exception:
                logger.exception(f"Failed to score {wb['name']}")
                cur.execute("ROLLBACK TO SAVEPOINT score_wb")
                cur.execute("RELEASE SAVEPOINT score_wb")
                failures += 1
                continue

        conn.commit()

    except Exception:
        logger.exception("Fatal error in scoring job")
        conn.rollback()
        return 1
    finally:
        cur.close()
        conn.close()

    return failures


if __name__ == "__main__":
    sys.exit(1 if run() else 0)
