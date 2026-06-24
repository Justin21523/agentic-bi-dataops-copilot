"""LLM-backed Text2SQL adapter stub. Activated via LLM_PROVIDER=openai."""
from __future__ import annotations

import re
from abc import abstractmethod

from models.base import FewShotExample, Text2SQLAdapter

_FENCE_RE = re.compile(r"```(?:sql)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)


class LLMAdapterBase(Text2SQLAdapter):
    """Base class for LLM-backed Text2SQL adapters.

    Concrete subclasses implement _call_api(system, user) -> str.
    The prompt architecture:
      - system: schema context + role instruction
      - user: few-shot examples + question
    """

    def _build_system_prompt(self, schema_context: str) -> str:
        return (
            "You are a SQL expert. Generate DuckDB-compatible SQL queries for a retail "
            "data warehouse.\n\n"
            "RULES:\n"
            "1. Return ONLY the SQL query — no explanation, no markdown fences.\n"
            "2. Always include a LIMIT clause (default 1000).\n"
            "3. Use only these tables: orders, order_items, customers, products, "
            "payments, reviews, daily_sales.\n"
            "4. Use DATE_TRUNC for time grouping, not strftime.\n"
            "5. When joining, use explicit ON conditions.\n\n"
            f"SCHEMA:\n{schema_context}"
        )

    def _build_user_prompt(
        self,
        question: str,
        few_shot_examples: list[FewShotExample],
    ) -> str:
        parts: list[str] = []
        for ex in few_shot_examples[:5]:
            parts.append(f"Q: {ex.question}\nSQL: {ex.sql}")
        parts.append(f"Q: {question}\nSQL:")
        return "\n\n".join(parts)

    def _strip_markdown_fences(self, raw: str) -> str:
        m = _FENCE_RE.search(raw)
        if m:
            return m.group(1).strip()
        return raw.strip()

    @abstractmethod
    def _call_api(self, system: str, user: str) -> str:
        """Single-turn LLM API call. Returns raw model output string."""
        ...

    def generate_sql(
        self,
        question: str,
        schema_context: str,
        few_shot_examples: list[FewShotExample],
    ) -> str:
        system = self._build_system_prompt(schema_context)
        user = self._build_user_prompt(question, few_shot_examples)
        raw = self._call_api(system, user)
        return self._strip_markdown_fences(raw)

    @property
    def adapter_name(self) -> str:
        return "llm_base"


class OpenAIAdapter(LLMAdapterBase):
    """OpenAI-backed Text2SQL adapter. Requires OPENAI_API_KEY env var."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self._model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI()
            except ImportError:
                raise ImportError(
                    "openai package not installed. Run: uv add openai"
                )
        return self._client

    def _call_api(self, system: str, user: str) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
            max_tokens=512,
        )
        return response.choices[0].message.content or ""

    @property
    def adapter_name(self) -> str:
        return f"openai/{self._model}"


def get_adapter(provider: str = "rule_based") -> "Text2SQLAdapter":
    """Factory function that returns the correct adapter for the given provider.

    Args:
        provider: "rule_based" or "openai".
    """
    from models.rule_based import RuleBasedAdapter
    if provider == "rule_based":
        return RuleBasedAdapter()
    if provider == "openai":
        return OpenAIAdapter()
    raise ValueError(f"Unknown LLM provider: {provider!r}. Choose 'rule_based' or 'openai'.")
