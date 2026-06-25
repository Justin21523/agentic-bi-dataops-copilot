"""Structured logging factory. Named log.py (not logging.py) to avoid shadowing stdlib."""
from __future__ import annotations

import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """Return a consistently formatted logger.

    Args:
        name: Logger name, typically ``__name__``.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
        logger.addHandler(handler)
        logger.propagate = False
    try:
        from utils.config import get_settings
        level = get_settings().log_level.upper()
    except Exception:
        level = "INFO"
    logger.setLevel(getattr(logging, level, logging.INFO))
    return logger
