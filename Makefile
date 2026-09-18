.PHONY: up down restart logs rebuild update dev dev-down ps sh clean

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=100

rebuild:
	docker compose build --no-cache
	docker compose up -d

update:
	git pull
	$(MAKE) up

dev:
	docker compose -f docker-compose.dev.yml up -d

dev-down:
	docker compose -f docker-compose.dev.yml down

ps:
	docker compose ps

sh:
	docker compose exec app sh

clean:
	docker compose down --rmi all --volumes --remove-orphans
