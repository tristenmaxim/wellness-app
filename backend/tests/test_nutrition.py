from app.nutrition import _extract_nutrients, _pick_best_match


def test_pick_best_match_skips_processed_forms():
    # Regression: USDA's top hit for "avocado" is "Oil, avocado" (884 kcal/100g),
    # not the raw fruit — we don't want oil when the user meant the fruit.
    foods = [
        {"description": "Oil, avocado"},
        {"description": "Avocados, raw, California"},
        {"description": "Avocados, raw, all commercial varieties"},
    ]
    best = _pick_best_match("avocado", foods)
    assert "oil" not in best["description"].lower()


def test_pick_best_match_prefers_shortest_prefix_match():
    # Regression: "banana" search top hit was "Bananas, dehydrated, or banana
    # powder" (346 kcal/100g) instead of raw banana (89 kcal/100g).
    foods = [
        {"description": "Bananas, dehydrated, or banana powder"},
        {"description": "Bananas, raw"},
    ]
    best = _pick_best_match("banana", foods)
    assert best["description"] == "Bananas, raw"


def test_pick_best_match_respects_an_explicit_form_request():
    foods = [
        {"description": "Bananas, raw"},
        {"description": "Bananas, dehydrated, or banana powder"},
    ]
    best = _pick_best_match("banana powder", foods)
    assert "powder" in best["description"].lower()


def test_pick_best_match_empty_list_returns_none():
    assert _pick_best_match("anything", []) is None


def test_extract_nutrients_picks_kcal_not_kj():
    # Regression: USDA lists "Energy" twice (KCAL and kJ) — a plain
    # nutrientName lookup grabbed whichever came last in the list (kJ),
    # inflating honey from 61 kcal/20g to 254 kcal/20g.
    food = {
        "foodNutrients": [
            {"nutrientName": "Protein", "value": 0.3, "unitName": "G"},
            {"nutrientName": "Total lipid (fat)", "value": 0.0, "unitName": "G"},
            {"nutrientName": "Carbohydrate, by difference", "value": 82.4, "unitName": "G"},
            {"nutrientName": "Energy", "value": 304, "unitName": "KCAL"},
            {"nutrientName": "Energy", "value": 1270.0, "unitName": "kJ"},
        ]
    }
    result = _extract_nutrients(food, weight_g=20)
    assert result["kcal"] == round(304 * 0.2, 1)  # 60.8, not 254.0


def test_extract_nutrients_missing_energy_returns_none():
    food = {"foodNutrients": [{"nutrientName": "Protein", "value": 1, "unitName": "G"}]}
    assert _extract_nutrients(food, weight_g=100) is None


def test_extract_nutrients_scales_by_weight():
    food = {
        "foodNutrients": [
            {"nutrientName": "Energy", "value": 100, "unitName": "KCAL"},
            {"nutrientName": "Protein", "value": 10, "unitName": "G"},
            {"nutrientName": "Total lipid (fat)", "value": 5, "unitName": "G"},
            {"nutrientName": "Carbohydrate, by difference", "value": 20, "unitName": "G"},
        ]
    }
    result = _extract_nutrients(food, weight_g=250)
    assert result == {"kcal": 250.0, "protein_g": 25.0, "fat_g": 12.5, "carbs_g": 50.0}
