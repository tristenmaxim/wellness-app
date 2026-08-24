import base64
import json

import httpx

from app.config import settings

SYSTEM_PROMPT = """Ты — нутрициолог-ассистент. Тебе показывают фото еды или текстовое описание приёма пищи.
Разбей блюдо на отдельные продукты/компоненты и оцени для каждого: название на русском (коротко),
короткое название этого же продукта на английском в базовой словарной форме (для поиска в базе USDA,
например "oatmeal", "banana", "honey", "chicken breast"), вес порции в граммах, калории,
белки/жиры/углеводы в граммах.
Если название блюда неполное или неоднозначное (например «омлет» без числа яиц, «суп» без вида,
просто «салат») — не отказывайся, а оцени по типичной средней порции этого блюда.
Возвращай {"items": []} только если текст вообще не описывает никакую еду.
Отвечай СТРОГО в формате JSON без пояснений и markdown:
{"items": [{"name": "...", "name_en": "...", "weight_g": число, "kcal": число, "protein_g": число, "fat_g": число, "carbs_g": число}]}
Если распознать еду невозможно, верни {"items": []}."""


class LLMError(Exception):
    pass


async def analyze_meal(
    *, text: str | None = None, photo_bytes: bytes | None = None
) -> list[dict]:
    if not text and not photo_bytes:
        raise LLMError("no input provided")

    content: list[dict] = []
    if text:
        content.append({"type": "text", "text": text})
    if photo_bytes:
        b64 = base64.b64encode(photo_bytes).decode()
        content.append(
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
        )
    if not text:
        content.append({"type": "text", "text": "Определи блюдо по фото."})

    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
        "temperature": 0.2,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
            json=payload,
        )

    if resp.status_code != 200:
        raise LLMError(f"OpenRouter error {resp.status_code}: {resp.text}")

    data = resp.json()
    raw = data["choices"][0]["message"]["content"]
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise LLMError(f"could not parse LLM response as JSON: {raw[:200]}") from e

    return parsed.get("items", [])
