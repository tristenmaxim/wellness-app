import os

import pytest

from app import llm, nutrition
from app.config import settings


async def fake_analyze_meal(*, text=None, photo_bytes=None):
    if not text and not photo_bytes:
        raise llm.LLMError("no input provided")
    if text == "непонятная бредятина xyz":
        return []
    return [{"name": "Рис", "name_en": "rice", "weight_g": 150, "kcal": 195, "protein_g": 4, "fat_g": 0.4, "carbs_g": 42}]


async def fake_lookup_usda_hit(name, weight_g):
    return {
        "kcal": round(1.3 * weight_g, 1),
        "protein_g": round(0.027 * weight_g, 1),
        "fat_g": round(0.003 * weight_g, 1),
        "carbs_g": round(0.28 * weight_g, 1),
    }


async def fake_lookup_usda_miss(name, weight_g):
    return None


def _create_meal(client, headers, eaten_at, kcal):
    return client.post(
        "/api/meals",
        json={
            "meal_type": "snack",
            "eaten_at": eaten_at,
            "items": [
                {"name": "X", "weight_g": 100, "kcal": kcal, "protein_g": 0, "fat_g": 0, "carbs_g": 0, "source": "usda"}
            ],
        },
        headers=headers,
    )


def test_analyze_text_usda_hit_overrides_llm_estimate(client, auth_headers, monkeypatch):
    monkeypatch.setattr(llm, "analyze_meal", fake_analyze_meal)
    monkeypatch.setattr(nutrition, "lookup_usda", fake_lookup_usda_hit)
    resp = client.post("/api/meals/analyze", data={"text": "рис"}, headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["source"] == "usda"
    assert items[0]["kcal"] == pytest.approx(150 * 1.3, abs=0.1)


def test_analyze_text_falls_back_to_llm_estimate_on_usda_miss(client, auth_headers, monkeypatch):
    monkeypatch.setattr(llm, "analyze_meal", fake_analyze_meal)
    monkeypatch.setattr(nutrition, "lookup_usda", fake_lookup_usda_miss)
    resp = client.post("/api/meals/analyze", data={"text": "рис"}, headers=auth_headers)
    items = resp.json()["items"]
    assert items[0]["source"] == "llm_estimate"
    assert items[0]["kcal"] == 195


def test_analyze_with_no_input_returns_502(client, auth_headers, monkeypatch):
    monkeypatch.setattr(llm, "analyze_meal", fake_analyze_meal)
    resp = client.post("/api/meals/analyze", headers=auth_headers)
    assert resp.status_code == 502


def test_analyze_unrecognizable_text_returns_empty_items(client, auth_headers, monkeypatch):
    monkeypatch.setattr(llm, "analyze_meal", fake_analyze_meal)
    monkeypatch.setattr(nutrition, "lookup_usda", fake_lookup_usda_miss)
    resp = client.post("/api/meals/analyze", data={"text": "непонятная бредятина xyz"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["items"] == []


def test_analyze_photo_saves_file_and_returns_token(client, auth_headers, monkeypatch):
    monkeypatch.setattr(llm, "analyze_meal", fake_analyze_meal)
    monkeypatch.setattr(nutrition, "lookup_usda", fake_lookup_usda_miss)
    files = {"photo": ("food.jpg", b"\xff\xd8\xff\xe0fakejpegbytes", "image/jpeg")}
    resp = client.post("/api/meals/analyze", files=files, headers=auth_headers)
    assert resp.status_code == 200
    token = resp.json()["photo_token"]
    assert token and token.endswith(".jpg")
    assert os.path.isfile(os.path.join(settings.photos_dir, token))


def test_create_meal_totals_are_sum_of_items(client, auth_headers):
    resp = client.post(
        "/api/meals",
        json={
            "meal_type": "lunch",
            "eaten_at": "2026-08-25T12:00:00",
            "items": [
                {"name": "A", "weight_g": 100, "kcal": 100, "protein_g": 5, "fat_g": 2, "carbs_g": 10, "source": "usda"},
                {"name": "B", "weight_g": 50, "kcal": 50, "protein_g": 1, "fat_g": 1, "carbs_g": 5, "source": "llm_estimate"},
            ],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_kcal"] == 150
    assert data["total_protein"] == 6
    assert len(data["items"]) == 2


def test_create_meal_rejects_photo_token_path_traversal(client, auth_headers):
    resp = client.post(
        "/api/meals",
        json={
            "meal_type": "lunch",
            "eaten_at": "2026-08-25T12:00:00",
            "photo_token": "../../etc/passwd",
            "items": [{"name": "A", "weight_g": 100, "kcal": 100, "protein_g": 5, "fat_g": 2, "carbs_g": 10, "source": "usda"}],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_day_summary_aggregates_and_filters_by_date(client, auth_headers):
    _create_meal(client, auth_headers, "2026-08-25T08:00:00", 300)
    _create_meal(client, auth_headers, "2026-08-25T20:00:00", 400)
    _create_meal(client, auth_headers, "2026-08-24T23:59:59", 999)  # different day, must not count

    resp = client.get("/api/meals/day", params={"date": "2026-08-25"}, headers=auth_headers)
    data = resp.json()
    assert data["total_kcal"] == 700
    assert len(data["meals"]) == 2


def test_delete_own_meal_removes_it_from_day_summary(client, auth_headers):
    created = _create_meal(client, auth_headers, "2026-08-25T08:00:00", 100)
    meal_id = created.json()["id"]

    del_resp = client.delete(f"/api/meals/{meal_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    day = client.get("/api/meals/day", params={"date": "2026-08-25"}, headers=auth_headers).json()
    assert day["meals"] == []


def test_delete_meal_of_another_user_returns_404(client, auth_headers, auth_headers_2):
    created = _create_meal(client, auth_headers, "2026-08-25T08:00:00", 100)
    meal_id = created.json()["id"]

    resp = client.delete(f"/api/meals/{meal_id}", headers=auth_headers_2)
    assert resp.status_code == 404


def test_delete_nonexistent_meal_returns_404(client, auth_headers):
    resp = client.delete("/api/meals/does-not-exist", headers=auth_headers)
    assert resp.status_code == 404


def test_meal_photo_is_only_visible_to_its_owner(client, auth_headers, auth_headers_2, monkeypatch):
    monkeypatch.setattr(llm, "analyze_meal", fake_analyze_meal)
    monkeypatch.setattr(nutrition, "lookup_usda", fake_lookup_usda_miss)
    files = {"photo": ("food.jpg", b"\xff\xd8\xff\xe0fakejpegbytes", "image/jpeg")}
    photo_token = client.post("/api/meals/analyze", files=files, headers=auth_headers).json()["photo_token"]

    created = client.post(
        "/api/meals",
        json={
            "meal_type": "snack",
            "eaten_at": "2026-08-25T08:00:00",
            "photo_token": photo_token,
            "items": [{"name": "X", "weight_g": 100, "kcal": 100, "protein_g": 0, "fat_g": 0, "carbs_g": 0, "source": "usda"}],
        },
        headers=auth_headers,
    )
    meal_id = created.json()["id"]

    assert client.get(f"/api/meals/{meal_id}/photo", headers=auth_headers).status_code == 200
    assert client.get(f"/api/meals/{meal_id}/photo", headers=auth_headers_2).status_code == 404
