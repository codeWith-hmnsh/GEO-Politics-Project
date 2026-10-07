"""One-off: writes draft curated data files (data/curated/*.json). Editors own these files afterwards."""
import json
import os

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
cur = "data/curated/"
review = {
    "reviewedAt": "2026-10-07",
    "needsEditorialReview": True,
    "note": "Draft written during setup. An editor must confirm statuses, dates and wording before public launch (docs/CONTENT-GUIDE.md section 6).",
}


def dump(name, obj):
    with open(cur + name, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


dump("conflicts.json", {**review, "items": [
    {"id": "ru-ua", "name": "Russia – Ukraine War", "parties": ["Russia", "Ukraine"], "flags": ["RUS", "UKR"], "start": "2022-02-24", "type": "interstate", "status": "active", "intensity": 3, "at": [48.4, 37.6], "callout": True,
     "why": ["Largest war in Europe since 1945, with heavy military and civilian losses.", "Shook global grain, fertiliser and gas markets, which affects prices far away.", "Sits at the centre of NATO–Russia tension and Western sanctions on Russia."],
     "strikes": [[[47.2, 39.7], [49.99, 36.23]], [[50.6, 36.6], [50.45, 30.52]], [[45.0, 34.1], [46.48, 30.72]], [[47.2, 39.7], [47.84, 35.14]], [[50.4, 30.5], [53.2, 34.4]], [[49.4, 32.0], [47.2, 39.7]]],
     "keywords": ["ukraine", "kyiv", "kharkiv", "odesa", "zelensky", "zelenskyy", "donbas", "crimea"]},
    {"id": "gaza", "name": "Israel – Gaza Conflict", "parties": ["Israel", "Hamas"], "flags": ["ISR", "PSE"], "start": "2023-10-07", "type": "interstate-nonstate", "status": "ceasefire", "intensity": 2, "at": [31.4, 34.4], "callout": True,
     "why": ["Very high civilian toll and humanitarian need in Gaza.", "A ceasefire agreed in October 2025 is fragile, with repeated deadly strikes reported.", "Draws in regional actors and affects Middle East diplomacy."],
     "strikes": [], "keywords": ["gaza", "hamas", "rafah", "khan younis", "west bank"]},
    {"id": "sudan", "name": "Sudan Civil War", "parties": ["Sudanese Armed Forces", "Rapid Support Forces"], "flags": ["SDN"], "start": "2023-04-15", "type": "civil", "status": "active", "intensity": 3, "at": [14.2, 28.8], "callout": True,
     "why": ["One of the world's largest displacement crises.", "Fighting spreads hunger across a country of about 50 million people.", "Regional powers back different sides, which makes peace harder."],
     "strikes": [], "keywords": ["sudan", "khartoum", "darfur", "el fasher", "rsf", "kordofan"]},
    {"id": "myanmar", "name": "Myanmar Civil War", "parties": ["Military government", "Resistance and ethnic armed groups"], "flags": ["MMR"], "start": "2021-02-01", "type": "civil", "status": "active", "intensity": 2, "at": [21.5, 95.9],
     "why": ["Conflict since the 2021 military coup has split the country.", "Borders India, China, Bangladesh and Thailand, with refugee flows.", "Tests ASEAN's ability to manage a crisis among its members."],
     "strikes": [], "keywords": ["myanmar", "burma", "rakhine", "junta"]},
    {"id": "drc", "name": "Eastern DR Congo", "parties": ["DR Congo", "M23 rebels"], "flags": ["COD"], "start": "2022-03-01", "type": "civil", "status": "active", "intensity": 2, "at": [-1.7, 29.2],
     "why": ["Long-running war in a region rich in minerals used in electronics.", "Millions displaced in North and South Kivu.", "Strains relations between DR Congo and Rwanda despite peace talks."],
     "strikes": [], "keywords": ["goma", "m23", "north kivu", "south kivu", "bukavu"]},
    {"id": "sahel", "name": "Sahel Insurgencies", "parties": ["Mali, Burkina Faso, Niger", "Armed Islamist groups"], "flags": ["MLI", "BFA", "NER"], "start": "2012-01-17", "type": "insurgency", "status": "active", "intensity": 2, "at": [14.3, -1.6],
     "why": ["Armed groups control wide rural areas across three countries.", "Military governments have changed foreign partners in the region.", "Instability pushes migration toward coastal West Africa and Europe."],
     "strikes": [], "keywords": ["sahel", "mali", "burkina faso", "niger", "jnim"]},
    {"id": "yemen", "name": "Yemen Conflict", "parties": ["Houthis", "Yemeni government and allies"], "flags": ["YEM"], "start": "2014-09-21", "type": "civil", "status": "active", "intensity": 2, "at": [15.4, 44.2],
     "why": ["Long civil war with a severe humanitarian crisis.", "Attacks near the Red Sea have disrupted global shipping routes.", "Linked to the wider Iran–Saudi and Middle East rivalry."],
     "strikes": [[[15.4, 44.2], [14.6, 42.0]]], "keywords": ["yemen", "houthi", "houthis", "aden", "sanaa", "red sea"]},
    {"id": "haiti", "name": "Haiti Gang Violence", "parties": ["Armed gangs", "Haitian state and international mission"], "flags": ["HTI"], "start": "2021-07-07", "type": "civil", "status": "active", "intensity": 1, "at": [18.55, -72.3],
     "why": ["Gangs control most of the capital, Port-au-Prince.", "Hunger and displacement are rising.", "An international security mission is trying to restore order."],
     "strikes": [], "keywords": ["haiti", "port-au-prince"]},
]})

dump("organizations.json", {**review, "items": [
    {"id": "NATO", "name": "NATO", "color": "#2F6FDB", "pin": [58, 16], "hq": "Brussels", "shown": True, "purpose": "Military alliance. An attack on one member is treated as an attack on all (Article 5).",
     "members": ["ALB", "BEL", "BGR", "CAN", "HRV", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "ITA", "LVA", "LTU", "LUX", "MNE", "NLD", "MKD", "NOR", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE", "TUR", "GBR", "USA"]},
    {"id": "EU", "name": "European Union", "color": "#4F5FE0", "pin": [46, 0], "hq": "Brussels", "shown": True, "purpose": "Political and economic union with a single market; 20 members share the euro.",
     "members": ["AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE"]},
    {"id": "BRICS", "name": "BRICS", "color": "#E39A1E", "pin": [52, 112], "hq": "New Development Bank, Shanghai", "shown": True, "purpose": "Group of major emerging economies seeking more say in global finance.",
     "members": ["BRA", "RUS", "IND", "CHN", "ZAF", "EGY", "ETH", "IRN", "ARE", "IDN"]},
    {"id": "SCO", "name": "Shanghai Cooperation Organisation", "color": "#C2416B", "pin": [44, 66], "hq": "Beijing", "shown": True, "purpose": "Eurasian security and economic organisation led by China and Russia.",
     "members": ["CHN", "RUS", "IND", "PAK", "KAZ", "KGZ", "TJK", "UZB", "IRN", "BLR"]},
    {"id": "QUAD", "name": "Quad", "color": "#0EA5C6", "pin": [-4, 134], "hq": "No headquarters", "shown": True, "purpose": "Strategic dialogue of four Indo-Pacific democracies.",
     "members": ["IND", "USA", "JPN", "AUS"]},
    {"id": "ASEAN", "name": "ASEAN", "color": "#2FA36B", "pin": [12, 104], "hq": "Jakarta", "shown": False, "purpose": "Regional bloc of Southeast Asian nations for trade and stability.",
     "members": ["BRN", "KHM", "IDN", "LAO", "MYS", "MMR", "PHL", "SGP", "THA", "VNM", "TLS"]},
    {"id": "G7", "name": "G7", "color": "#3A4A5A", "pin": [47, -40], "hq": "Rotating presidency", "shown": False, "purpose": "Seven large advanced economies that coordinate on economy and security.",
     "members": ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "JPN"]},
    {"id": "G20", "name": "G20", "color": "#1F9E8F", "pin": [-10, -30], "hq": "Rotating presidency", "shown": False, "purpose": "Forum of the largest economies, about 85% of world GDP. The EU and African Union are also members.",
     "members": ["ARG", "AUS", "BRA", "CAN", "CHN", "FRA", "DEU", "IND", "IDN", "ITA", "JPN", "MEX", "RUS", "SAU", "ZAF", "KOR", "TUR", "GBR", "USA"]},
]})

dump("summits.json", {**review, "items": [
    {"id": "apec-2026", "org": None, "name": "APEC Leaders' Meeting", "host": "Shenzhen, China", "at": [22.54, 114.06], "month": "2026-11", "datesConfirmed": False,
     "agenda": ["Trade and supply chains across the Asia-Pacific", "Digital economy", "Growth and investment"]},
    {"id": "cop31", "org": None, "name": "COP31 climate summit", "host": "Antalya, Türkiye", "at": [36.9, 30.7], "month": "2026-11", "datesConfirmed": False,
     "agenda": ["Emission cuts", "Climate finance", "Adaptation"]},
    {"id": "g20-2026", "org": "G20", "name": "G20 Leaders' Summit", "host": "Miami, United States", "at": [25.78, -80.19], "month": "2026-12", "datesConfirmed": False,
     "agenda": ["Global growth", "Trade", "Debt and finance"]},
]})

dump("borders.json", {**review, "hostile": [
    {"id": "loc", "name": "Line of Control (India–Pakistan)", "countries": ["IND", "PAK"], "dashed": False,
     "line": [[32.6, 74.6], [33.2, 74.0], [33.8, 73.9], [34.4, 73.9], [34.6, 74.4], [34.7, 75.6], [34.6, 76.4], [35.0, 77.0], [35.1, 77.3]]},
    {"id": "dmz", "name": "Korean Demilitarized Zone", "countries": ["PRK", "KOR"], "dashed": False,
     "line": [[37.75, 126.1], [37.95, 126.7], [38.3, 127.2], [38.3, 127.6], [38.62, 128.36]]},
    {"id": "ua-front", "name": "Russia–Ukraine front line (approximate)", "countries": ["RUS", "UKR"], "dashed": True,
     "line": [[46.55, 32.4], [46.8, 33.6], [47.4, 35.2], [47.7, 36.6], [47.95, 37.3], [48.6, 37.9], [49.2, 38.0], [49.8, 37.7], [50.3, 37.6]]},
], "disputed": [
    {"id": "kashmir", "name": "Kashmir", "claimants": "Claimed by India and Pakistan; parts administered by India, Pakistan and China",
     "polygon": [[32.5, 74.0], [33.5, 73.3], [34.5, 73.2], [35.5, 72.6], [36.6, 72.6], [37.1, 74.5], [36.6, 76.0], [35.7, 77.8], [35.6, 80.2], [34.6, 79.5], [32.6, 78.4], [32.5, 76.0]]},
    {"id": "crimea", "name": "Crimea", "claimants": "Annexed by Russia in 2014; recognised internationally as part of Ukraine",
     "polygon": [[46.2, 33.4], [45.3, 32.4], [44.4, 33.6], [44.9, 35.5], [45.4, 36.6], [45.6, 35.0], [46.1, 34.8]]},
]})

dump("crises.json", {**review, "items": [
    {"iso3": "ARG", "basis": "IMF programme approved in 2025 after years of high inflation."},
    {"iso3": "PAK", "basis": "IMF Extended Fund Facility since 2024; tight public finances."},
    {"iso3": "EGY", "basis": "IMF programme and pressure on the currency."},
    {"iso3": "LBN", "basis": "Deep financial collapse since 2019."},
]})

print("curated ok")
