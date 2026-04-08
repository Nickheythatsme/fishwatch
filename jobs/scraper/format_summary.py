"""Format scrape_summary.json into Markdown for GitHub Issue body."""

import json
import sys


def main() -> None:
    summary_path = sys.argv[1] if len(sys.argv) > 1 else "artifacts/scrape_summary.json"
    with open(summary_path) as f:
        data = json.load(f)

    failed = [r for r in data["results"] if r["status"] == "FAILED"]
    degraded = [r for r in data["results"] if r["status"] == "DEGRADED"]
    lines: list[str] = []

    lines.append(f"Total scrapers: {data['total_scrapers']}")
    lines.append(f"Failed: {data['failed']}")
    lines.append(f"Degraded: {data['degraded']}")
    db_failures = data.get("db_failures", 0)
    if db_failures:
        lines.append(f"DB insert failures: {db_failures}")
    lines.append("")

    for r in failed:
        lines.append(f"### {r['source_name']} (FAILED)")
        lines.append(f"- URL: {r['source_url']}")
        lines.append(f"- Error: {r.get('error_message', 'unknown')}")
        if r.get("traceback"):
            lines.append("<details><summary>Stack trace</summary>")
            lines.append("")
            lines.append("```")
            lines.append(r["traceback"][:2000])
            lines.append("```")
            lines.append("</details>")
        lines.append("")

    for r in degraded:
        lines.append(f"### {r['source_name']} (DEGRADED)")
        lines.append(f"- URL: {r['source_url']}")
        if r.get("body_fallback_used"):
            lines.append("- CSS selector missed — fell back to body text")
        if r.get("posts_failed", 0) > 0:
            lines.append(f"- Posts failed: {r['posts_failed']}")
        lines.append("")

    print("\n".join(lines))


if __name__ == "__main__":
    main()
