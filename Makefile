PYTHON ?= python3.12
VENV := backend/.venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

.PHONY: install install-backend install-frontend sample-data etl train evaluate api frontend dev test test-backend test-frontend test-e2e import-data import-fixture docker-up docker-down

install: install-backend install-frontend

install-backend:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -U pip
	$(PIP) install -e "backend[dev]"

install-frontend:
	cd frontend && npm install

sample-data:
	$(PY) -m lyrics_lab.ingestion.generate_sample_data

validate-data:
	$(PY) -m lyrics_lab.ingestion.validate_safe_data --input-dir data/sample

data-ready:
	$(PY) -m lyrics_lab.ingestion.prepare_data

import-data:
	@if [ -z "$(INPUT)" ]; then echo "Usage: make import-data INPUT=/path/to/safe-derived-csv"; exit 2; fi
	$(PY) -m lyrics_lab.ingestion.import_data --input-dir "$(INPUT)"

import-fixture:
	rm -rf data/import_fixture_work
	mkdir -p data/import_fixture_work
	cp examples/import_fixture/*.csv data/import_fixture_work/
	$(PY) -m lyrics_lab.ingestion.import_data --input-dir data/import_fixture_work

etl:
	$(PY) -m lyrics_lab.ingestion.etl

train:
	$(PY) -m lyrics_lab.models.train
	$(PY) -m lyrics_lab.ingestion.etl

evaluate:
	$(PY) -m lyrics_lab.evaluation.run_evaluation

api:
	$(PY) -m uvicorn lyrics_lab.api.main:app --app-dir backend/src --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) sample-data
	$(MAKE) train
	$(MAKE) evaluate
	$(MAKE) etl
	$(MAKE) -j2 api frontend

test: test-backend test-frontend

test-backend:
	cd backend && .venv/bin/pytest

test-frontend:
	cd frontend && npm test

test-e2e:
	cd frontend && npm run test:e2e

docker-up:
	docker compose up --build

docker-down:
	docker compose down
