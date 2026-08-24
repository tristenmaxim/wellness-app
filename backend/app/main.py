import datetime
import os
import uuid

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import auth, llm, nutrition, schemas
from app.config import settings
from app.database import Base, engine, get_db
from app.models import Goal, Meal, MealItem, User

Base.metadata.create_all(bind=engine)
os.makedirs(settings.photos_dir, exist_ok=True)

app = FastAPI(title="Wellness API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- auth ---


@app.post("/api/auth/telegram-init", response_model=schemas.TokenResponse)
def auth_telegram_init(body: schemas.TelegramInitAuth, db: Session = Depends(get_db)):
    try:
        tg_user = auth.verify_init_data(body.init_data)
    except auth.TelegramAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    user = auth.upsert_user(db, tg_user)
    return {"token": auth.create_token(user.id)}


@app.post("/api/auth/telegram-widget", response_model=schemas.TokenResponse)
def auth_telegram_widget(body: schemas.TelegramWidgetAuth, db: Session = Depends(get_db)):
    try:
        tg_user = auth.verify_login_widget(body.model_dump())
    except auth.TelegramAuthError as e:
        raise HTTPException(status_code=401, detail=str(e))
    user = auth.upsert_user(db, tg_user)
    return {"token": auth.create_token(user.id)}


@app.get("/api/me", response_model=schemas.MeResponse)
def me(user: User = Depends(auth.get_current_user)):
    return schemas.MeResponse(
        id=user.id, first_name=user.first_name, username=user.username, photo_url=user.photo_url
    )


# --- meals ---


def _item_from_db(item: MealItem) -> schemas.MealItemOut:
    return schemas.MealItemOut(
        id=item.id,
        name=item.name,
        weight_g=item.weight_g,
        kcal=item.kcal,
        protein_g=item.protein_g,
        fat_g=item.fat_g,
        carbs_g=item.carbs_g,
        source=item.source,
    )


def _meal_from_db(meal: Meal) -> schemas.MealOut:
    return schemas.MealOut(
        id=meal.id,
        meal_type=meal.meal_type,
        eaten_at=meal.eaten_at,
        total_kcal=meal.total_kcal,
        total_protein=meal.total_protein,
        total_fat=meal.total_fat,
        total_carbs=meal.total_carbs,
        has_photo=bool(meal.photo_filename),
        items=[_item_from_db(i) for i in meal.items],
    )


@app.post("/api/meals/analyze", response_model=schemas.AnalyzeResponse)
async def analyze_meal(
    text: str | None = Form(default=None),
    photo: UploadFile | None = File(default=None),
    user: User = Depends(auth.get_current_user),
):
    photo_bytes = None
    photo_token = None
    if photo is not None:
        photo_bytes = await photo.read()
        photo_token = f"{uuid.uuid4()}.jpg"
        with open(os.path.join(settings.photos_dir, photo_token), "wb") as f:
            f.write(photo_bytes)

    try:
        raw_items = await llm.analyze_meal(text=text, photo_bytes=photo_bytes)
    except llm.LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))

    items: list[schemas.MealItemOut] = []
    for it in raw_items:
        name = it.get("name", "?")
        name_en = it.get("name_en", name)
        weight_g = float(it.get("weight_g", 0))
        usda = await nutrition.lookup_usda(name_en, weight_g)
        if usda:
            items.append(
                schemas.MealItemOut(
                    id=str(uuid.uuid4()), name=name, weight_g=weight_g, source="usda", **usda
                )
            )
        else:
            items.append(
                schemas.MealItemOut(
                    id=str(uuid.uuid4()),
                    name=name,
                    weight_g=weight_g,
                    kcal=float(it.get("kcal", 0)),
                    protein_g=float(it.get("protein_g", 0)),
                    fat_g=float(it.get("fat_g", 0)),
                    carbs_g=float(it.get("carbs_g", 0)),
                    source="llm_estimate",
                )
            )

    return schemas.AnalyzeResponse(items=items, photo_token=photo_token)


@app.post("/api/meals", response_model=schemas.MealOut)
def create_meal(
    body: schemas.MealCreate,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if body.photo_token and "/" in body.photo_token:
        raise HTTPException(status_code=400, detail="invalid photo_token")

    meal = Meal(
        user_id=user.id,
        meal_type=body.meal_type,
        eaten_at=body.eaten_at,
        raw_text=body.raw_text,
        photo_filename=body.photo_token,
        total_kcal=sum(i.kcal for i in body.items),
        total_protein=sum(i.protein_g for i in body.items),
        total_fat=sum(i.fat_g for i in body.items),
        total_carbs=sum(i.carbs_g for i in body.items),
    )
    meal.items = [
        MealItem(
            name=i.name,
            weight_g=i.weight_g,
            kcal=i.kcal,
            protein_g=i.protein_g,
            fat_g=i.fat_g,
            carbs_g=i.carbs_g,
            source=i.source,
        )
        for i in body.items
    ]
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return _meal_from_db(meal)


@app.get("/api/meals/day", response_model=schemas.DaySummary)
def meals_for_day(
    date: str,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    day = datetime.date.fromisoformat(date)
    start = datetime.datetime.combine(day, datetime.time.min)
    end = datetime.datetime.combine(day, datetime.time.max)

    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user.id, Meal.eaten_at >= start, Meal.eaten_at <= end)
        .order_by(Meal.eaten_at)
        .all()
    )
    return schemas.DaySummary(
        date=date,
        total_kcal=sum(m.total_kcal for m in meals),
        total_protein=sum(m.total_protein for m in meals),
        total_fat=sum(m.total_fat for m in meals),
        total_carbs=sum(m.total_carbs for m in meals),
        meals=[_meal_from_db(m) for m in meals],
    )


@app.delete("/api/meals/{meal_id}")
def delete_meal(
    meal_id: str, user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)
):
    meal = db.get(Meal, meal_id)
    if meal is None or meal.user_id != user.id:
        raise HTTPException(status_code=404, detail="meal not found")
    db.delete(meal)
    db.commit()
    return {"ok": True}


@app.get("/api/meals/{meal_id}/photo")
def meal_photo(
    meal_id: str, user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)
):
    meal = db.get(Meal, meal_id)
    if meal is None or meal.user_id != user.id or not meal.photo_filename:
        raise HTTPException(status_code=404, detail="photo not found")
    path = os.path.join(settings.photos_dir, meal.photo_filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="photo not found")
    return FileResponse(path)


# --- goals ---


@app.get("/api/goals", response_model=schemas.GoalOut | None)
def get_goal(user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.user_id == user.id).one_or_none()
    if goal is None:
        return None
    return schemas.GoalOut(
        daily_kcal=goal.daily_kcal,
        protein_g=goal.protein_g,
        fat_g=goal.fat_g,
        carbs_g=goal.carbs_g,
    )


@app.put("/api/goals", response_model=schemas.GoalOut)
def set_goal(
    body: schemas.GoalIn, user: User = Depends(auth.get_current_user), db: Session = Depends(get_db)
):
    goal = db.query(Goal).filter(Goal.user_id == user.id).one_or_none()
    if goal is None:
        goal = Goal(user_id=user.id, **body.model_dump())
        db.add(goal)
    else:
        for k, v in body.model_dump().items():
            setattr(goal, k, v)
    db.commit()
    return body
