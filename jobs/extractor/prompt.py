EXTRACTION_SYSTEM_PROMPT = """You are a structured data extractor for fishing reports.
Given a fishing report from a fly shop or agency, extract structured information.
Respond ONLY with valid JSON — no markdown, no preamble, no backticks."""

EXTRACTION_USER_PROMPT = """Extract fishing conditions from this report. Return a JSON array
where each element represents one water body mentioned in the report.

For each water body, extract:
- water_body: string — the name of the river, lake, or stream
- report_date: string — the date this report covers (ISO format, or null)
- sentiment: string — one of "excellent", "good", "fair", "poor", "off"
- species: string[] — fish species mentioned as being caught or targetable
- fly_patterns: string[] — specific fly patterns, sizes, and techniques mentioned
- conditions_summary: string — 1-2 sentence plain English summary of conditions
- flow_commentary: string — what the report says about water levels/flows (or null)
- water_clarity: string — "clear", "slightly off", "off-color", "muddy" (or null)
- water_temp: string — water temperature if mentioned (or null)
- best_time: string — time of day recommended if mentioned (or null)
- techniques: string[] — fishing techniques mentioned (e.g., "nymphing", "dry fly", "streamer")

Here is the fishing report:

{report_content}"""
