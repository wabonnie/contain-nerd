"""Consumer RabbitMQ eseguito in un thread in background.

Si collega a una coda durevole condivisa: se il servizio viene scalato, le
repliche competono sulla stessa coda e RabbitMQ distribuisce i messaggi
(round-robin) — dimostrazione della scalabilità orizzontale.
"""
import json
import os
import threading
import time
from datetime import datetime, timezone

import pika

from .db import get_collection
from .logger import get_logger

logger = get_logger("service-notifications")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
EXCHANGE = os.getenv("RABBITMQ_EXCHANGE", "ticketflow.events")
QUEUE = os.getenv("RABBITMQ_QUEUE", "notifications.order-created")
ROUTING_KEY = "order.created"


def _handle_message(ch, method, _properties, body) -> None:
    try:
        event = json.loads(body)
        notification = {
            "user_id": event["user_id"],
            "user_email": event.get("user_email"),
            "type": "order.created",
            "title": "Ordine confermato",
            "message": (
                f"Il tuo ordine #{event['order_id']} per "
                f"\"{event['event_title']}\" (x{event['quantity']}) è stato confermato."
            ),
            "read": False,
            "created_at": datetime.now(timezone.utc),
        }
        get_collection().insert_one(notification)
        logger.info(f"Notifica creata per ordine={event['order_id']}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Errore nel processare il messaggio: {exc}")
        # requeue=False: evita loop infiniti su messaggi malformati.
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def _consume_loop() -> None:
    while True:
        try:
            conn = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            channel = conn.channel()
            channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
            channel.queue_declare(queue=QUEUE, durable=True)
            channel.queue_bind(exchange=EXCHANGE, queue=QUEUE, routing_key=ROUTING_KEY)
            # Fair dispatch: un messaggio alla volta per consumer.
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE, on_message_callback=_handle_message)
            logger.info(f"In ascolto sulla coda '{QUEUE}' (routing_key={ROUTING_KEY})")
            channel.start_consuming()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Connessione al broker persa, retry tra 5s: {exc}")
            time.sleep(5)


def start_consumer() -> None:
    thread = threading.Thread(target=_consume_loop, daemon=True)
    thread.start()
