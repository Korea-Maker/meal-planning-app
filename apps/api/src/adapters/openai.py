import json
import logging
from typing import Any

from openai import AsyncOpenAI, APIError, RateLimitError, APIConnectionError

from src.core.config import settings

logger = logging.getLogger(__name__)

RECIPE_EXTRACTION_SYSTEM_PROMPT = """당신은 레시피 추출 전문가입니다. 웹페이지 HTML에서 레시피 정보를 추출하여 JSON 형식으로 반환합니다.

다음 JSON 스키마에 맞게 레시피를 추출하세요:

{
  "title": "레시피 제목 (필수)",
  "description": "레시피 설명 (선택, 최대 2000자)",
  "image_url": "메인 이미지 URL (선택)",
  "prep_time_minutes": 준비 시간(분) (선택, 정수),
  "cook_time_minutes": 조리 시간(분) (선택, 정수),
  "servings": 인분 수 (필수, 정수, 기본값 4),
  "difficulty": "easy|medium|hard" (필수, 기본값 "medium"),
  "categories": ["breakfast", "lunch", "dinner", "snack", "dessert", "appetizer", "side", "drink"] 중 선택 (배열),
  "tags": ["태그1", "태그2"] (배열, 최대 20개),
  "ingredients": [
    {
      "name": "재료명 (필수)",
      "amount": 수량 (필수, 숫자),
      "unit": "단위" (필수, 예: "큰술", "g", "개"),
      "notes": "추가 설명" (선택),
      "order_index": 순서 (정수)
    }
  ],
  "instructions": [
    {
      "step_number": 단계 번호 (정수, 1부터 시작),
      "description": "조리 설명 (필수)",
      "image_url": "단계별 이미지 URL" (선택)
    }
  ]
}

규칙:
1. HTML에서 Schema.org 또는 JSON-LD 데이터가 있으면 우선 사용하세요.
2. 재료의 수량과 단위를 명확히 분리하세요 (예: "소금 1큰술" → amount: 1, unit: "큰술", name: "소금")
3. 조리 단계는 논리적 순서대로 번호를 매기세요.
4. 카테고리는 레시피 내용에 맞게 적절히 선택하세요.
5. 추출이 불가능한 경우 해당 필드는 null 또는 기본값으로 설정하세요.
6. 모든 텍스트는 한국어로 변환하세요 (재료명, 조리법 등).

오직 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요."""


class OpenAIAdapter:
    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key is not configured")
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def extract_recipe_from_html(
        self,
        html_content: str,
        url: str,
    ) -> dict[str, Any]:
        """
        HTML 콘텐츠에서 레시피 정보를 추출합니다.

        Args:
            html_content: 웹페이지의 HTML 콘텐츠
            url: 원본 URL (컨텍스트용)

        Returns:
            추출된 레시피 정보 딕셔너리

        Raises:
            ValueError: 응답 파싱 실패
            APIError: OpenAI API 오류
        """
        truncated_html = self._truncate_html(html_content, max_chars=50000)

        user_message = f"""다음 URL의 HTML에서 레시피를 추출하세요:

URL: {url}

HTML:
{truncated_html}

위 HTML에서 레시피 정보를 JSON 형식으로 추출하세요."""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": RECIPE_EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from OpenAI")

            recipe_data = json.loads(content)
            return self._validate_and_normalize(recipe_data)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            raise ValueError(f"Failed to parse recipe data: {e}") from e

        except (RateLimitError, APIConnectionError) as e:
            logger.error(f"OpenAI API error: {e}")
            raise

        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    def _truncate_html(self, html: str, max_chars: int) -> str:
        """HTML을 지정된 길이로 자릅니다."""
        if len(html) <= max_chars:
            return html

        logger.warning(f"HTML content truncated from {len(html)} to {max_chars} characters")
        return html[:max_chars] + "\n... (truncated)"

    def _validate_and_normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        """추출된 데이터를 검증하고 정규화합니다."""
        title = data.get("title")
        if not title:
            raise ValueError("Recipe title is required")

        ingredients = data.get("ingredients", [])
        if not ingredients:
            raise ValueError("At least one ingredient is required")

        instructions = data.get("instructions", [])
        if not instructions:
            raise ValueError("At least one instruction is required")

        valid_categories = {
            "breakfast", "lunch", "dinner", "snack",
            "dessert", "appetizer", "side", "drink"
        }
        categories = data.get("categories", [])
        normalized_categories = [c for c in categories if c in valid_categories]

        valid_difficulties = {"easy", "medium", "hard"}
        difficulty = data.get("difficulty", "medium")
        if difficulty not in valid_difficulties:
            difficulty = "medium"

        normalized_ingredients = []
        for idx, ing in enumerate(ingredients):
            normalized_ingredients.append({
                "name": str(ing.get("name", "")),
                "amount": float(ing.get("amount", 1)),
                "unit": str(ing.get("unit", "개")),
                "notes": ing.get("notes"),
                "order_index": ing.get("order_index", idx),
            })

        normalized_instructions = []
        for idx, inst in enumerate(instructions, start=1):
            normalized_instructions.append({
                "step_number": inst.get("step_number", idx),
                "description": str(inst.get("description", "")),
                "image_url": inst.get("image_url"),
            })

        return {
            "title": str(title)[:200],
            "description": str(data.get("description", ""))[:2000] if data.get("description") else None,
            "image_url": data.get("image_url"),
            "prep_time_minutes": self._parse_int(data.get("prep_time_minutes")),
            "cook_time_minutes": self._parse_int(data.get("cook_time_minutes")),
            "servings": self._parse_int(data.get("servings")) or 4,
            "difficulty": difficulty,
            "categories": normalized_categories,
            "tags": (data.get("tags", []) or [])[:20],
            "ingredients": normalized_ingredients,
            "instructions": normalized_instructions,
        }

    def _parse_int(self, value: Any) -> int | None:
        """값을 정수로 변환합니다."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None


openai_adapter = OpenAIAdapter()
