"""One-off: writes the draft curated relations baseline (data/curated/relations.json). Editors own it afterwards."""
import json
import os

os.chdir(os.path.join(os.path.dirname(__file__), ".."))

R = []


def rel(a, b, status, basis):
    R.append({"a": a, "b": b, "status": status, "basis": basis})


EUROPE_NATO = ["POL", "DEU", "FRA", "GBR", "EST", "LVA", "LTU", "FIN", "SWE", "DNK", "NLD", "BEL", "CZE", "ROU", "NOR", "ITA", "ESP", "CAN"]

# India
rel("IND", "RUS", "ally", "Long-time defence supplier; strategic partnership since 2000")
rel("IND", "FRA", "ally", "Defence partner (Rafale jets) and nuclear energy partner")
rel("IND", "JPN", "ally", "Quad partner and major investor")
rel("IND", "AUS", "ally", "Quad partner")
rel("IND", "ARE", "ally", "Top trade and energy partner")
rel("IND", "ISR", "ally", "Defence and technology partner")
rel("IND", "SAU", "ally", "Major oil supplier and strategic partner")
rel("IND", "BTN", "ally", "Close neighbour; hydropower cooperation")
rel("IND", "VNM", "ally", "Indo-Pacific security partner")
rel("IND", "USA", "mixed", "Quad and defence partner; trade tensions since 2025")
rel("IND", "PAK", "hostile", "Kashmir dispute along the Line of Control; wars in 1947, 1965, 1971 and 1999")
rel("IND", "CHN", "mixed", "Large trade partner; border dispute along the Line of Actual Control")
rel("IND", "TUR", "mixed", "Trade ties; Turkey backs Pakistan on Kashmir")
rel("IND", "BGD", "mixed", "Close neighbour; ties shifting since 2024")
rel("IND", "AFG", "mixed", "Engagement without formal recognition of the government")

# United States
for c in EUROPE_NATO:
    rel("USA", c, "ally", "NATO ally")
rel("USA", "JPN", "ally", "Treaty ally")
rel("USA", "AUS", "ally", "Treaty ally; Quad partner")
rel("USA", "KOR", "ally", "Treaty ally")
rel("USA", "PHL", "ally", "Treaty ally")
rel("USA", "ISR", "ally", "Major security partner")
rel("USA", "MEX", "ally", "Top trade partner (USMCA)")
rel("USA", "RUS", "hostile", "Sanctions; opposing sides over the war in Ukraine")
rel("USA", "IRN", "hostile", "No diplomatic relations; sanctions")
rel("USA", "PRK", "hostile", "Nuclear standoff; no diplomatic relations")
rel("USA", "CUB", "hostile", "Embargo")
rel("USA", "VEN", "hostile", "Sanctions; no ambassadors")
rel("USA", "CHN", "mixed", "Strategic rival and one of the largest trade partners")
rel("USA", "TUR", "mixed", "NATO ally with frequent disputes")
rel("USA", "SAU", "mixed", "Security partner with policy differences")

# Russia
rel("RUS", "BLR", "ally", "Union State")
rel("RUS", "CHN", "ally", "\"No limits\" strategic partnership")
rel("RUS", "PRK", "ally", "Mutual defence treaty (2024)")
rel("RUS", "IRN", "ally", "Strategic partnership treaty")
rel("RUS", "KAZ", "ally", "CSTO and Eurasian Economic Union partner")
rel("RUS", "TJK", "ally", "CSTO partner")
rel("RUS", "KGZ", "ally", "CSTO partner")
rel("RUS", "UKR", "hostile", "At war since 2022")
for c in EUROPE_NATO:
    rel("RUS", c, "hostile", "Sanctions; supports Ukraine")
rel("RUS", "JPN", "hostile", "Sanctions; territorial dispute over the Kuril Islands")
rel("RUS", "TUR", "mixed", "Trade and energy ties; NATO member")
rel("RUS", "ARM", "mixed", "Treaty ally drifting away")
rel("RUS", "AZE", "mixed", "Trade partner; ties tense since 2024")

# Pakistan
rel("PAK", "CHN", "ally", "\"All-weather\" partner; China–Pakistan Economic Corridor")
rel("PAK", "SAU", "ally", "Mutual defence pact (2025) and financial support")
rel("PAK", "TUR", "ally", "Close political and defence ties")
rel("PAK", "AZE", "ally", "Close partner")
rel("PAK", "ARE", "ally", "Remittances and financial support")
rel("PAK", "USA", "mixed", "On-off security partner; ties warmed in 2025")
rel("PAK", "AFG", "mixed", "Deadly border clashes and refugee disputes")
rel("PAK", "IRN", "mixed", "Neighbour; border tensions")

# Ukraine
for c in EUROPE_NATO:
    rel("UKR", c, "ally", "Military or financial support")
rel("UKR", "BLR", "hostile", "Allowed Russian forces to attack from its territory")
rel("UKR", "HUN", "mixed", "EU member that blocks some aid")
rel("UKR", "TUR", "mixed", "Mediator that trades with both sides")

# China
rel("CHN", "KHM", "ally", "Close partner")
rel("CHN", "LAO", "ally", "Close partner")
rel("CHN", "SRB", "ally", "Strategic partner")
rel("CHN", "IRN", "ally", "Major oil buyer; 25-year cooperation deal")
rel("CHN", "JPN", "mixed", "Large trade partner; island dispute")
rel("CHN", "PHL", "mixed", "South China Sea disputes")
rel("CHN", "VNM", "mixed", "Trade partner; South China Sea disputes")
rel("CHN", "AUS", "mixed", "Trade partner; security rival")
rel("CHN", "KOR", "mixed", "Trade partner; US treaty ally")
rel("CHN", "TWN", "hostile", "Claims Taiwan; military pressure across the Taiwan Strait")

# Middle East
rel("ISR", "IRN", "hostile", "Direct strikes on each other in 2024 and 2025")
rel("ISR", "PSE", "hostile", "War in Gaza since 2023; occupation of the West Bank")
rel("ISR", "LBN", "hostile", "Conflict with Hezbollah")
rel("ISR", "ARE", "ally", "Abraham Accords (2020)")
rel("ISR", "EGY", "mixed", "Peace treaty (1979); strained by the Gaza war")
rel("IRN", "SAU", "mixed", "Rivals that restored ties in 2023")
rel("PRK", "KOR", "hostile", "Divided peninsula; armistice since 1953")
rel("ARM", "AZE", "mixed", "Decades of conflict; peace framework agreed in 2025")

data = {
    "reviewedAt": "2026-10-07",
    "needsEditorialReview": True,
    "note": "Draft baseline. Each row is from the point of view of `a`. Countries not listed fall back to rules: shared NATO/EU membership = ally, active war parties = hostile, otherwise neutral.",
    "items": R,
}
with open("data/curated/relations.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=1, ensure_ascii=False)
print(len(R), "relations")
