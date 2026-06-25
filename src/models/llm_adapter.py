"""LLM-backed Text2SQL adapter. Supports OpenAI and llama.cpp HTTP server."""
from __future__ import annotations

import re
from abc import abstractmethod

import requests as _requests

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
        conversation_history: list[dict] | None = None,
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

    # OpenAI adapter uses LLMAdapterBase.generate_sql which already has the optional param


class LlamaCppAdapter(Text2SQLAdapter):
    """Calls a llama.cpp server (OpenAI-compatible HTTP API).

    Start the server with: ./llama-server -m <model.gguf> --port 8080
    Set LLAMA_CPP_BASE_URL=http://localhost:8080/v1 (default).
    """

    def generate_sql(
        self,
        question: str,
        schema_context: str,
        few_shot_examples: list[FewShotExample],
        conversation_history: list[dict] | None = None,
    ) -> str:
        from utils.config import get_settings
        settings = get_settings()
        base_url = settings.llama_cpp_base_url.rstrip("/")

        system = (
            "You are a DuckDB SQL expert for a retail data warehouse.\n\n"
            "RULES:\n"
            "1. Return ONLY the SQL query — no explanation, no markdown fences.\n"
            "2. Always include a LIMIT clause (default 1000).\n"
            "3. Use only these tables: orders, order_items, customers, products, "
            "payments, reviews, daily_sales, query_history.\n"
            "4. Use DATE_TRUNC for time grouping, not strftime.\n"
            "5. DuckDB syntax only — no MySQL or PostgreSQL extensions.\n"
            "6. Max subquery nesting depth: 3 levels.\n\n"
            f"SCHEMA:\n{schema_context}"
        )
        messages: list[dict] = [{"role": "system", "content": system}]
        # Few-shot examples (limited to 3 to leave room for conversation history)
        for ex in few_shot_examples[:3]:
            messages.append({"role": "user", "content": ex.question})
            messages.append({"role": "assistant", "content": ex.sql})
        # Multi-turn conversation history (prior exchanges)
        if conversation_history:
            for msg in conversation_history[-6:]:  # keep last 3 exchanges
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": question})
        model_name = settings.llama_cpp_model  # "default" for llama.cpp; explicit name for Ollama

        try:
            resp = _requests.post(
                f"{base_url}/chat/completions",
                json={
                    "model": model_name,
                    "messages": messages,
                    "temperature": 0,
                    "max_tokens": 512,
                },
                timeout=60,
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            m = _FENCE_RE.search(raw)
            return m.group(1).strip() if m else raw
        except (_requests.exceptions.ConnectionError, _requests.exceptions.Timeout):
            from utils.log import get_logger
            get_logger(__name__).warning(
                "llama.cpp unreachable at %s — falling back to rule_based", base_url
            )
            from models.rule_based import RuleBasedAdapter
            return RuleBasedAdapter().generate_sql(question, schema_context, few_shot_examples)
        except Exception as exc:
            from utils.log import get_logger
            get_logger(__name__).warning(
                "llama.cpp error (%s) — falling back to rule_based", exc
            )
            from models.rule_based import RuleBasedAdapter
            return RuleBasedAdapter().generate_sql(question, schema_context, few_shot_examples)

    @property
    def adapter_name(self) -> str:
        return "llama_cpp"


def get_adapter(provider: str = "rule_based") -> "Text2SQLAdapter":
    """Factory function that returns the correct adapter for the given provider.

    Args:
        provider: "rule_based", "openai", or "llama_cpp".
    """
    from models.rule_based import RuleBasedAdapter
    if provider == "rule_based":
        return RuleBasedAdapter()
    if provider == "openai":
        return OpenAIAdapter()
    if provider == "llama_cpp":
        return LlamaCppAdapter()
    raise ValueError(
        f"Unknown LLM provider: {provider!r}. Choose 'rule_based', 'openai', or 'llama_cpp'."
    )
