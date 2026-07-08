"""Logging JSON minimale, condiviso dai servizi FastAPI."""
import json
import logging
import os
import sys


class JsonFormatter(logging.Formatter):
    def __init__(self, service: str) -> None:
        super().__init__()
        self.service = service

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record),
            "level": record.levelname.lower(),
            "service": self.service,
            "message": record.getMessage(),
        }
        return json.dumps(payload)


def get_logger(service: str) -> logging.Logger:
    logger = logging.getLogger(service)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter(service))
        logger.addHandler(handler)
    logger.setLevel(os.getenv("LOG_LEVEL", "info").upper())
    return logger
