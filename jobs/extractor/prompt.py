EXTRACTION_SYSTEM_PROMPT = """You are a structured data extractor for fishing reports from Central Oregon fly shops and agencies.
Given a fishing report, extract structured information about fishing conditions for each water body mentioned.
Respond ONLY with valid JSON — no markdown, no preamble, no backticks."""

EXTRACTION_USER_PROMPT = """Extract fishing conditions from this report. Return a JSON array
where each element represents one water body mentioned in the report.

Match each water body to the closest name from this list of known Pacific Northwest waters:

Central Oregon:
- Lower Deschutes River (below Pelton Dam, trophy redside water)
- Upper Deschutes River (through Bend, urban stretch)
- Middle Deschutes River (between Bend and Lake Billy Chinook)
- Crooked River (below Bowman Dam, tailwater)
- Fall River (spring creek near La Pine)
- Metolius River (spring-fed, near Camp Sherman)
- Crane Prairie Reservoir (stillwater, "cranebows")
- Hosmer Lake (fly fishing only, Atlantic salmon)
- East Lake (Newberry Caldera)
- Davis Lake (shallow fly fishing lake)
- Tumalo Creek (small mountain stream west of Bend)

Oregon (beyond Central):
- McKenzie River (below Leaburg Dam, near Eugene)
- Willamette River (through Eugene/Portland)
- Hood River (Columbia Gorge, steelhead)
- Rogue River (Southern Oregon, Holy Water section)
- North Umpqua River (fly-only steelhead section)
- Klamath River (below Keno Dam, redband trout)
- Sandy River (near Portland, steelhead)
- Clackamas River (near Portland, steelhead)

Washington / Idaho:
- Spokane River (through Spokane, WA)
- North Fork Coeur d'Alene River (panhandle Idaho, cutthroat)
- St. Joe River (Idaho, cutthroat)
- Grande Ronde River (OR/WA border, steelhead)

Idaho:
- Silver Creek (spring creek near Sun Valley)
- Big Wood River (Sun Valley area)
- Big Lost River (below Mackay Reservoir)
- South Fork Boise River (mountain tailwater)

If the report just says "the Deschutes" without specifying a section, use context clues
(shop location, access points mentioned) to determine which section. If still ambiguous,
use "Lower Deschutes River" as the default for guide shops.

For each water body, extract:
- water_body: string — the name from the list above (use the exact name)
- report_date: string — the date this report covers (ISO format YYYY-MM-DD, or null)
- sentiment: string — one of "excellent", "good", "fair", "poor", "off"
- species: string[] — fish species mentioned as being caught or targetable
- fly_patterns: string[] — specific fly patterns mentioned (e.g. "BWO #18", "Pheasant Tail #16")
- conditions_summary: string — 1-2 sentence plain English summary of fishing conditions
- flow_commentary: string — what the report says about water levels/flows (or null)
- water_clarity: string — "clear", "slightly off", "off-color", "muddy" (or null)
- water_temp: string — water temperature if mentioned (or null)
- best_time: string — time of day recommended if mentioned (or null)
- techniques: string[] — fishing techniques mentioned (e.g. "nymphing", "dry fly", "streamer")
- hatches: object[] — insect hatches mentioned, each with:
  - name: string — hatch name (e.g. "BWO", "PMD", "October Caddis", "Chironomid")
  - stage: string — life stage being fished ("nymph", "emerger", "dun", "spinner", "adult", or null)
  - timing: string — time of day the hatch is active ("morning", "midday", "afternoon", "evening", or null)
- river_section: string — specific river section, reach, or access point mentioned (e.g. "Warm Springs to Trout Creek", "Riverbend Park", or null)

Here is the fishing report:

{report_content}"""
