# TicketFlow — comandi rapidi
.PHONY: help up down build push pull logs ps scale clean zip

help:
	@echo "Comandi disponibili:"
	@echo "  make up        - avvia lo stack (build incluso)"
	@echo "  make down      - ferma lo stack"
	@echo "  make build     - builda le immagini"
	@echo "  make push      - builda, tagga e pusha sul registry locale"
	@echo "  make pull      - pulla le immagini dal registry locale"
	@echo "  make logs      - segue i log di tutti i servizi"
	@echo "  make ps        - stato dei container"
	@echo "  make scale     - scala notifications a 3 repliche"
	@echo "  make clean     - rimuove container, volumi e reti"
	@echo "  make zip       - crea l'archivio di consegna"

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build

push:
	bash scripts/build-and-push.sh

pull:
	bash scripts/pull-images.sh

logs:
	docker compose logs -f

ps:
	docker compose ps

scale:
	docker compose up -d --scale service-notifications=3

clean:
	docker compose down -v --remove-orphans

zip:
	bash scripts/create-zip.sh
