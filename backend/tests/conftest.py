import os
import tempfile

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test-bot-token")
os.environ.setdefault("OPENROUTER_API_KEY", "test-openrouter-key")
os.environ.setdefault("USDA_API_KEY", "test-usda-key")
os.environ.setdefault("PHOTOS_DIR", tempfile.mkdtemp(prefix="wellness-test-photos-"))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app

from tests.helpers import make_init_data


@pytest.fixture()
def bot_token() -> str:
    return settings.telegram_bot_token


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _register(client, bot_token, telegram_id, first_name="Test") -> dict:
    init_data = make_init_data(bot_token, telegram_id=telegram_id, first_name=first_name)
    resp = client.post("/api/auth/telegram-init", json={"init_data": init_data})
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def auth_headers(client, bot_token):
    return _register(client, bot_token, telegram_id=100001, first_name="Alice")


@pytest.fixture()
def auth_headers_2(client, bot_token):
    return _register(client, bot_token, telegram_id=100002, first_name="Bob")
