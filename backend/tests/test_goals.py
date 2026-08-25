def test_default_goal_seeded_on_registration(client, auth_headers):
    resp = client.get("/api/goals", headers=auth_headers)
    assert resp.json() == {"daily_kcal": 2100.0, "protein_g": 100.0, "fat_g": 70.0, "carbs_g": 230.0}


def test_set_goal_upserts_existing_row(client, auth_headers):
    client.put(
        "/api/goals",
        json={"daily_kcal": 1800, "protein_g": 120, "fat_g": 60, "carbs_g": 180},
        headers=auth_headers,
    )
    resp = client.get("/api/goals", headers=auth_headers)
    assert resp.json() == {"daily_kcal": 1800.0, "protein_g": 120.0, "fat_g": 60.0, "carbs_g": 180.0}


def test_goals_are_isolated_per_user(client, auth_headers, auth_headers_2):
    client.put(
        "/api/goals",
        json={"daily_kcal": 1800, "protein_g": 120, "fat_g": 60, "carbs_g": 180},
        headers=auth_headers,
    )
    other = client.get("/api/goals", headers=auth_headers_2).json()
    assert other["daily_kcal"] == 2100.0  # untouched default, not the other user's edit
