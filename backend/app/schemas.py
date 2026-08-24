import datetime

from pydantic import BaseModel


class TelegramInitAuth(BaseModel):
    init_data: str


class TelegramWidgetAuth(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    token: str


class MeResponse(BaseModel):
    id: str
    first_name: str
    username: str | None
    photo_url: str | None


class MealItemIn(BaseModel):
    name: str
    weight_g: float
    kcal: float
    protein_g: float
    fat_g: float
    carbs_g: float
    source: str = "llm_estimate"


class MealItemOut(MealItemIn):
    id: str


class AnalyzeResponse(BaseModel):
    items: list[MealItemOut]
    photo_token: str | None = None


class MealCreate(BaseModel):
    meal_type: str
    eaten_at: datetime.datetime
    raw_text: str | None = None
    photo_token: str | None = None
    items: list[MealItemIn]


class MealOut(BaseModel):
    id: str
    meal_type: str
    eaten_at: datetime.datetime
    total_kcal: float
    total_protein: float
    total_fat: float
    total_carbs: float
    has_photo: bool
    items: list[MealItemOut]

    class Config:
        from_attributes = True


class DaySummary(BaseModel):
    date: str
    total_kcal: float
    total_protein: float
    total_fat: float
    total_carbs: float
    meals: list[MealOut]


class GoalIn(BaseModel):
    daily_kcal: float
    protein_g: float
    fat_g: float
    carbs_g: float


class GoalOut(GoalIn):
    pass
