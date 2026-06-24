"""Abstract interface for Text2SQL adapters and few-shot example loading."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class FewShotExample:
    """A single question → SQL demonstration example."""

    question: str
    sql: str
    tables_used: list[str] = field(default_factory=list)
    notes: str = ""

    @classmethod
    def load_from_yaml(cls, path: str | Path) -> list["FewShotExample"]:
        """Load few-shot examples from a YAML file.

        Args:
            path: Path to YAML file with list of question/sql/tables_used entries.
        """
        with open(path) as f:
            raw = yaml.safe_load(f) or []
        return [
            cls(
                question=item["question"],
                sql=item["sql"].strip(),
                tables_used=item.get("tables_used", []),
                notes=item.get("notes", ""),
            )
            for item in raw
        ]


class Text2SQLAdapter(ABC):
    """Common interface for all Text2SQL backends.

    Implementations must not validate or modify the returned SQL — that is the
    validator's responsibility.
    """

    @abstractmethod
    def generate_sql(
        self,
        question: str,
        schema_context: str,
        few_shot_examples: list[FewShotExample],
    ) -> str:
        """Generate SQL from a natural language question.

        Args:
            question: Natural language question from the user.
            schema_context: Formatted schema prompt (from schema_retriever).
            few_shot_examples: Demonstration examples for in-context learning.

        Returns:
            Raw SQL string. May contain syntax errors — caller should validate.

        Raises:
            NotImplementedError: If the adapter cannot handle the question.
        """
        ...

    @property
    @abstractmethod
    def adapter_name(self) -> str:
        """Human-readable identifier for logging and evaluation reports."""
        ...
