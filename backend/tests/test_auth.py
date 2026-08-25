import time

import jwt as pyjwt

from app.config import settings
from tests.helpers import make_init_data, make_widget_data


def test_valid_init_data_creates_user_with_default_goal(client, bot_token):
    init_data = make_init_data(bot_token, telegram_id=1, first_name="Alice")
    resp = client.post("/api/auth/telegram-init", json={"init_data": init_data})
    assert resp.status_code == 200
    headers = {"Authorization": f"Bearer {resp.json()['token']}"}

    me = client.get("/api/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["first_name"] == "Alice"

    goal = client.get("/api/goals", headers=headers)
    assert goal.json() == {"daily_kcal": 2100.0, "protein_g": 100.0, "fat_g": 70.0, "carbs_g": 230.0}


def test_tampered_hash_rejected(client, bot_token):
    init_data = make_init_data(bot_token, telegram_id=2)
    tampered = init_data[:-8] + "deadbeef"
    resp = client.post("/api/auth/telegram-init", json={"init_data": tampered})
    assert resp.status_code == 401


def test_stale_auth_date_rejected(client, bot_token):
    old = int(time.time()) - 25 * 3600
    init_data = make_init_data(bot_token, telegram_id=3, auth_date=old)
    resp = client.post("/api/auth/telegram-init", json={"init_data": init_data})
    assert resp.status_code == 401


def test_missing_hash_rejected(client):
    resp = client.post("/api/auth/telegram-init", json={"init_data": "user=%7B%22id%22%3A1%7D&auth_date=123"})
    assert resp.status_code == 401


def test_valid_widget_auth(client, bot_token):
    data = make_widget_data(bot_token, telegram_id=4, first_name="Bob")
    resp = client.post("/api/auth/telegram-widget", json=data)
    assert resp.status_code == 200
    assert "token" in resp.json()


def test_tampered_widget_hash_rejected(client, bot_token):
    data = make_widget_data(bot_token, telegram_id=5, tamper=True)
    resp = client.post("/api/auth/telegram-widget", json=data)
    assert resp.status_code == 401


def test_relogin_updates_profile_without_duplicating_user(client, bot_token):
    r1 = client.post(
        "/api/auth/telegram-init",
        json={"init_data": make_init_data(bot_token, telegram_id=6, first_name="Carl")},
    )
    me1 = client.get("/api/me", headers={"Authorization": f"Bearer {r1.json()['token']}"}).json()

    r2 = client.post(
        "/api/auth/telegram-init",
        json={"init_data": make_init_data(bot_token, telegram_id=6, first_name="Carlos")},
    )
    me2 = client.get("/api/me", headers={"Authorization": f"Bearer {r2.json()['token']}"}).json()

    assert me1["id"] == me2["id"]
    assert me2["first_name"] == "Carlos"


def test_missing_bearer_token_rejected(client):
    resp = client.get("/api/me")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "missing bearer token"


def test_garbage_token_rejected(client):
    resp = client.get("/api/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid token"


def test_token_for_nonexistent_user_rejected(client):
    fake_sub = "00000000-0000-0000-0000-000000000000"
    token = pyjwt.encode({"sub": fake_sub, "exp": int(time.time()) + 3600}, settings.jwt_secret, algorithm="HS256")
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "user not found"
