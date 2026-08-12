#!/bin/bash

# cd "$(dirname "$0")"
# source .venv/bin/activate
# python3 run.py

set -e
cd "$(dirname "$0")"

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose down --remove-orphans >/dev/null 2>&1 || true
    docker compose build
    docker compose up
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down --remove-orphans >/dev/null 2>&1 || true
    docker-compose up --build
  else
    echo "Docker Compose is not available."
    exit 1
  fi
else
  echo "Docker is required to start the app."
  exit 1
fi