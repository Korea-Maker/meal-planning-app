"""Keyword-based meal type classification engine."""

import re


def _has_keyword(keywords: list[str], text: str) -> bool:
    """Check if any keyword exists as a whole word in text."""
    for kw in keywords:
        # Korean: simple substring match (Korean words are space-separated)
        if any("\uac00" <= ch <= "\ud7a3" for ch in kw):
            if kw in text:
                return True
        else:
            # English: word boundary match to avoid "egg" matching "eggplant"
            if re.search(r"\b" + re.escape(kw) + r"\b", text):
                return True
    return False


def classify_meal_types(
    title: str,
    title_original: str | None = None,
    categories: list[str] | None = None,
    tags: list[str] | None = None,
) -> list[str]:
    """
    Classify a recipe into meal types based on title, categories, and tags.

    Returns list of meal types: breakfast, lunch, dinner, snack.
    A recipe can belong to multiple meal types.
    """
    categories = categories or []
    tags = tags or []

    # Combine all text for keyword matching
    all_text = " ".join(
        [
            title.lower(),
            (title_original or "").lower(),
            " ".join(c.lower() for c in categories),
            " ".join(t.lower() for t in tags),
        ]
    )

    meal_types: set[str] = set()

    # Category-based mapping (highest priority)
    cat_lower = [c.lower() for c in categories]
    if "breakfast" in cat_lower:
        meal_types.add("breakfast")
    if "dessert" in cat_lower:
        meal_types.add("snack")
    if "side" in cat_lower:
        meal_types.update(["lunch", "dinner"])
    if "starter" in cat_lower or "appetizer" in cat_lower:
        meal_types.add("snack")

    # Korean keyword matching
    breakfast_kr = [
        "죽",
        "토스트",
        "시리얼",
        "팬케이크",
        "오트밀",
        "계란",
        "샌드위치",
        "스무디",
        "그래놀라",
        "식빵",
        "잼",
    ]
    lunch_kr = [
        "볶음밥",
        "비빔밥",
        "국수",
        "라면",
        "덮밥",
        "김밥",
        "도시락",
        "우동",
        "파스타",
        "샐러드",
        "냉면",
        "칼국수",
        "자장면",
        "짬뽕",
    ]
    dinner_kr = [
        "스테이크",
        "찜",
        "구이",
        "탕",
        "찌개",
        "전골",
        "갈비",
        "불고기",
        "로스트",
        "삼겹살",
        "보쌈",
        "족발",
        "수육",
        "샤브샤브",
    ]
    snack_kr = [
        "떡볶이",
        "떡",
        "쿠키",
        "케이크",
        "빵",
        "머핀",
        "와플",
        "디저트",
        "과자",
        "타르트",
        "브라우니",
        "마카롱",
        "푸딩",
        "아이스크림",
        "파전",
        "감자전",
        "해물전",
        "김치전",
        "녹두전",
        "호떡",
        "붕어빵",
        "튀김",
    ]

    # English keyword matching
    breakfast_en = [
        "porridge",
        "toast",
        "cereal",
        "pancake",
        "oatmeal",
        "egg",
        "sandwich",
        "smoothie",
        "granola",
        "breakfast",
        "waffle",
        "bacon",
        "omelet",
        "omelette",
        "french toast",
        "scramble",
    ]
    lunch_en = [
        "fried rice",
        "bibimbap",
        "noodle",
        "ramen",
        "rice bowl",
        "kimbap",
        "pasta",
        "salad",
        "wrap",
        "bowl",
        "soup",
        "sandwich",
        "burger",
        "taco",
        "quesadilla",
    ]
    dinner_en = [
        "steak",
        "stew",
        "roast",
        "grill",
        "braised",
        "curry",
        "casserole",
        "lasagna",
        "lamb",
        "beef",
        "pork",
        "chicken roast",
        "pot roast",
        "ribs",
    ]
    snack_en = [
        "cookie",
        "cake",
        "muffin",
        "waffle",
        "dessert",
        "snack",
        "brownie",
        "tart",
        "pie",
        "pudding",
        "ice cream",
        "pastry",
        "scone",
        "donut",
        "doughnut",
        "macaron",
        "fudge",
        "candy",
    ]

    if _has_keyword(breakfast_kr + breakfast_en, all_text):
        meal_types.add("breakfast")

    if _has_keyword(lunch_kr + lunch_en, all_text):
        meal_types.add("lunch")

    if _has_keyword(dinner_kr + dinner_en, all_text):
        meal_types.add("dinner")

    if _has_keyword(snack_kr + snack_en, all_text):
        meal_types.add("snack")

    # Fallback: if no meal_type matched, default to lunch + dinner
    if not meal_types:
        meal_types = {"lunch", "dinner"}

    return sorted(meal_types)
