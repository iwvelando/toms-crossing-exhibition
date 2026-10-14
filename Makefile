.DEFAULT_GOAL := help
DEV_PORT ?= 5173
PREVIEW_PORT ?= 4173
.PHONY: help setup dev dev-lan build preview preview-lan test check cert

help:
	@echo "setup        Install locked dependencies"
	@echo "dev          Local development at http://127.0.0.1:5173"
	@echo "dev-lan      HTTPS development on the local network, port 5173"
	@echo "preview      Build and serve locally on port 4173"
	@echo "preview-lan  Build and serve HTTPS on the local network, port 4173"
	@echo "check        Build and run browser tests"

setup:
	npm ci

dev:
	npm run dev -- --port $(DEV_PORT) --strictPort

cert:
	node scripts/local-cert.mjs

dev-lan: cert
	EXHIBITION_LAN=1 npm run dev -- --host 0.0.0.0 --port $(DEV_PORT) --strictPort

build:
	npm run build

preview: build
	npm run preview -- --port $(PREVIEW_PORT) --strictPort

preview-lan: build cert
	EXHIBITION_LAN=1 npm run preview -- --host 0.0.0.0 --port $(PREVIEW_PORT) --strictPort

test:
	npm test

check: build test
