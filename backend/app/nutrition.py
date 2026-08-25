import httpx

from app.config import settings

# Processed/derived forms that outrank the plain raw ingredient in USDA's search
# relevance ranking (e.g. "banana" search) but give wildly different nutrient
# density than what a user means by that name — skip them unless the query
# itself asked for that form.
_FORM_QUALIFIERS = (
    "dehydrated",
    "dried",
    "powder",
    "juice",
    "syrup",
    "chips",
    "candied",
    "concentrate",
    "extract",
    "flour",
    "oil",
)


def _pick_best_match(query: str, foods: list[dict]) -> dict | None:
    query_lower = query.lower()
    query_words = set(query_lower.split())
    requested_qualifiers = query_words & set(_FORM_QUALIFIERS)

    def is_plain_form(food: dict) -> bool:
        desc = food.get("description", "").lower()
        if requested_qualifiers:
            return True  # user explicitly asked for that form
        return not any(qual in desc for qual in _FORM_QUALIFIERS)

    def starts_with_query(food: dict) -> bool:
        # "Avocados, raw, ..." for query "avocado" — the strongest relevance
        # signal available: the plain ingredient names itself first, derived
        # products name the base ingredient after a comma or not at all.
        desc = food.get("description", "").lower()
        return desc.startswith(query_lower) or desc.startswith(query_lower.rstrip("s"))

    def matches_requested_qualifiers(food: dict) -> bool:
        desc = food.get("description", "").lower()
        return all(q in desc for q in requested_qualifiers)

    plain_matches = [f for f in foods if is_plain_form(f)]
    candidates = plain_matches or foods

    prefix_matches = [f for f in candidates if starts_with_query(f)]
    if prefix_matches:
        return min(prefix_matches, key=lambda f: len(f.get("description", "")))

    if requested_qualifiers:
        qualifier_matches = [f for f in candidates if matches_requested_qualifiers(f)]
        if qualifier_matches:
            return min(qualifier_matches, key=lambda f: len(f.get("description", "")))

    return candidates[0] if candidates else None


def _extract_nutrients(food: dict, weight_g: float) -> dict | None:
    """Pull per-100g Energy/Protein/Fat/Carbs from a USDA food record and scale to weight_g.

    USDA can list the same nutrientName twice under different units (e.g.
    "Energy" in both KCAL and kJ) — key on (name, unit) so a plain name
    lookup can't silently grab the wrong-unit entry.
    """
    nutrients = {
        (n["nutrientName"], n["unitName"]): n["value"] for n in food.get("foodNutrients", [])
    }
    energy = nutrients.get(("Energy", "KCAL"))
    protein = nutrients.get(("Protein", "G"))
    fat = nutrients.get(("Total lipid (fat)", "G"))
    carbs = nutrients.get(("Carbohydrate, by difference", "G"))

    if energy is None:
        return None

    scale = weight_g / 100.0
    return {
        "kcal": round(energy * scale, 1),
        "protein_g": round((protein or 0) * scale, 1),
        "fat_g": round((fat or 0) * scale, 1),
        "carbs_g": round((carbs or 0) * scale, 1),
    }


async def lookup_usda(name: str, weight_g: float) -> dict | None:
    """Search USDA FoodData Central for `name`, return per-portion nutrients scaled to weight_g, or None if not found."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.nal.usda.gov/fdc/v1/foods/search",
            params={
                "query": name,
                "api_key": settings.usda_api_key,
                "pageSize": 5,
                "dataType": "Foundation,SR Legacy",
            },
        )

    if resp.status_code != 200:
        return None

    foods = resp.json().get("foods", [])
    if not foods:
        return None

    best = _pick_best_match(name, foods)
    if best is None:
        return None

    return _extract_nutrients(best, weight_g)
