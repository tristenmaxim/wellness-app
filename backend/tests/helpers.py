import hashlib
import hmac
import json
import time
from urllib.parse import urlencode


def make_init_data(
    bot_token: str,
    telegram_id: int,
    first_name: str = "Test",
    username: str | None = None,
    auth_date: int | None = None,
) -> str:
    """Build a validly-signed Telegram Mini App initData string."""
    user = {"id": telegram_id, "first_name": first_name}
    if username:
        user["username"] = username
    params = {
        "user": json.dumps(user, ensure_ascii=False, separators=(",", ":")),
        "auth_date": str(auth_date if auth_date is not None else int(time.time())),
        "query_id": "AAtest",
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    params["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(params)


def make_widget_data(
    bot_token: str,
    telegram_id: int,
    first_name: str = "Test",
    username: str | None = None,
    auth_date: int | None = None,
    tamper: bool = False,
) -> dict:
    """Build a validly-signed Telegram Login Widget payload."""
    data = {
        "id": telegram_id,
        "first_name": first_name,
        "auth_date": auth_date if auth_date is not None else int(time.time()),
    }
    if username:
        data["username"] = username
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    data["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if tamper:
        data["hash"] = "0" * 64
    return data
