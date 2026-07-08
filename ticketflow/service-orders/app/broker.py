"""Producer RabbitMQ: pubblica gli eventi di dominio (es. order.created).

Usa un exchange di tipo 'topic' e messaggi persistenti. La connessione viene
ristabilita automaticamente se è caduta.
"""
import json
import os

import pika

from .logger import get_logger

logger = get_logger("service-orders")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
EXCHANGE = os.getenv("RABBITMQ_EXCHANGE", "ticketflow.events")


class Publisher:
    """Piccolo wrapper con riconnessione lazy."""

    def __init__(self) -> None:
        self._conn: pika.BlockingConnection | None = None
        self._channel = None

    def _ensure_channel(self):
        if self._conn is not None and self._conn.is_open and self._channel.is_open:
            return self._channel
        params = pika.URLParameters(RABBITMQ_URL)
        self._conn = pika.BlockingConnection(params)
        self._channel = self._conn.channel()
        # Exchange durevole: sopravvive al riavvio del broker.
        self._channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
        logger.info("Connesso a RabbitMQ")
        return self._channel

    def publish(self, routing_key: str, message: dict) -> None:
        try:
            channel = self._ensure_channel()
            channel.basic_publish(
                exchange=EXCHANGE,
                routing_key=routing_key,
                body=json.dumps(message).encode("utf-8"),
                properties=pika.BasicProperties(
                    content_type="application/json",
                    delivery_mode=2,  # messaggio persistente
                ),
            )
            logger.info(f"Evento pubblicato routing_key={routing_key}")
        except Exception as exc:  # noqa: BLE001
            # Il fallimento della notifica non deve bloccare l'ordine già salvato.
            logger.error(f"Pubblicazione su RabbitMQ fallita: {exc}")
            self._conn = None
            self._channel = None

    def close(self) -> None:
        try:
            if self._conn and self._conn.is_open:
                self._conn.close()
        except Exception:  # noqa: BLE001
            pass


publisher = Publisher()
