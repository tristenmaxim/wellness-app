import hashlib
import hmac
import time
from urllib.parse import parse_qsl

import jwt
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Goal, User

# Matches the "Поддержание" (maintain) preset on the Goals screen — a new
# user always has a target from their very first session, so the home
# screen's progress ring is never blank before they've visited Goals.
DEFAULT_GOAL = {"daily_kcal": 2100, "protein_g": 100, "fat_g": 70, "carbs_g": 230}

JWT_ALG = "HS256"
JWT_TTL_SECONDS = 30 * 24 * 3600
MAX_AUTH_AGE_SECONDS = 24 * 3600


class TelegramAuthError(Exception):
    pass


def verify_init_data(init_data: str) -> dict:
    """Verify Telegram Mini App WebApp initData. https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app"""
    pairs = dict(parse_qsl(init_data, strict_parsing=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("missing hash")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(
        b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256
    ).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise TelegramAuthError("invalid hash")

    auth_date = int(pairs.get("auth_date", "0"))
    if time.time() - auth_date > MAX_AUTH_AGE_SECONDS:
        raise TelegramAuthError("stale auth_date")

    import json

    user = json.loads(pairs["user"])
    return user


def verify_login_widget(data: dict) -> dict:
    """Verify Telegram Login Widget payload. https://core.telegram.org/widgets/login#checking-authorization"""
    data = dict(data)
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("missing hash")

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(data.items()) if v is not None
    )
    secret_key = hashlib.sha256(settings.telegram_bot_token.encode()).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise TelegramAuthError("invalid hash")

    auth_date = int(data.get("auth_date", "0"))
    if time.time() - auth_date > MAX_AUTH_AGE_SECONDS:
        raise TelegramAuthError("stale auth_date")

    return data


def upsert_user(db: Session, tg_user: dict) -> User:
    telegram_id = int(tg_user["id"])
    user = db.query(User).filter(User.telegram_id == telegram_id).one_or_none()
    first_name = tg_user.get("first_name", "")
    username = tg_user.get("username")
    photo_url = tg_user.get("photo_url")

    if user is None:
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            username=username,
            photo_url=photo_url,
        )
        db.add(user)
        db.flush()
        db.add(Goal(user_id=user.id, **DEFAULT_GOAL))
    else:
        user.first_name = first_name
        user.username = username
        user.photo_url = photo_url

    db.commit()
    db.refresh(user)
    return user


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + JWT_TTL_SECONDS}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALG)


def get_current_user(
    authorization: str = Header(default=""), db: Session = Depends(get_db)
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid token")

    user = db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="user not found")
    return user
