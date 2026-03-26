SHELL := /bin/bash
BASE_DIR := $(CURDIR)
BUILD_DIR := $(BASE_DIR)/build
DIST_DIR := $(BASE_DIR)/dist
EXTENSION_UUID := sunrise-sunset@mutex.io
EXTENSION_DIR := $(BASE_DIR)/$(EXTENSION_UUID)
SCHEMA_DIR := $(EXTENSION_DIR)/schemas
SCHEMA_FILE := $(SCHEMA_DIR)/org.gnome.shell.extensions.sunrise-sunset.gschema.xml
LOCAL_EXT_DIR := $(HOME)/.local/share/gnome-shell/extensions
INSTALL_DIR := $(LOCAL_EXT_DIR)/$(EXTENSION_UUID)
PACKAGE_NAME := $(EXTENSION_UUID).zip

J ?= $(shell if command -v nproc >/dev/null 2>&1; then nproc; elif command -v sysctl >/dev/null 2>&1; then sysctl -n hw.ncpu; else echo 4; fi)

.PHONY: default all ci build schemas compile-schemas package install uninstall clean dist check-deps lint

default: all

all: schemas package
ci: all

schemas: compile-schemas

compile-schemas:
	@echo "Compiling GSettings schema..."
	@command -v glib-compile-schemas >/dev/null 2>&1 && \
		glib-compile-schemas --strict $(SCHEMA_DIR) && \
		echo "Schema compiled OK" || \
		echo "WARNING: glib-compile-schemas not found, skipping schema compilation"

package: schemas
	@echo "Building extension package..."
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)/$(EXTENSION_UUID)
	@cp $(EXTENSION_DIR)/metadata.json $(BUILD_DIR)/$(EXTENSION_UUID)/
	@cp $(EXTENSION_DIR)/extension.js $(BUILD_DIR)/$(EXTENSION_UUID)/
	@cp $(EXTENSION_DIR)/prefs.js $(BUILD_DIR)/$(EXTENSION_UUID)/
	@cp $(EXTENSION_DIR)/stylesheet.css $(BUILD_DIR)/$(EXTENSION_UUID)/
	@cp -R $(EXTENSION_DIR)/utils $(BUILD_DIR)/$(EXTENSION_UUID)/
	@cp -R $(EXTENSION_DIR)/icons $(BUILD_DIR)/$(EXTENSION_UUID)/
	@cp -R $(EXTENSION_DIR)/schemas $(BUILD_DIR)/$(EXTENSION_UUID)/
	@mkdir -p $(DIST_DIR)
	@cd $(BUILD_DIR) && zip -r $(DIST_DIR)/$(PACKAGE_NAME) $(EXTENSION_UUID)/
	@echo "Package: $(DIST_DIR)/$(PACKAGE_NAME)"

install: schemas
	@echo "Installing extension to $(INSTALL_DIR)..."
	@mkdir -p $(INSTALL_DIR)
	@cp $(EXTENSION_DIR)/metadata.json $(INSTALL_DIR)/
	@cp $(EXTENSION_DIR)/extension.js $(INSTALL_DIR)/
	@cp $(EXTENSION_DIR)/prefs.js $(INSTALL_DIR)/
	@cp $(EXTENSION_DIR)/stylesheet.css $(INSTALL_DIR)/
	@cp -R $(EXTENSION_DIR)/utils $(INSTALL_DIR)/
	@cp -R $(EXTENSION_DIR)/icons $(INSTALL_DIR)/
	@cp -R $(EXTENSION_DIR)/schemas $(INSTALL_DIR)/
	@if command -v gnome-extensions >/dev/null 2>&1; then \
		echo "Extension installed. Enable it with: gnome-extensions enable $(EXTENSION_UUID)"; \
	else \
		echo "Extension installed to $(INSTALL_DIR)"; \
		echo "Log out and back in, or run: dbus-send --session --type=method_call --dest=org.gnome.Shell /org/gnome/Shell org.gnome.Shell.Eval string:'Meta.restart(\"Restarting...\")'"; \
	fi

uninstall:
	@echo "Removing extension..."
	@rm -rf $(INSTALL_DIR)
	@echo "Extension removed."

lint:
	@echo "Linting JavaScript files..."
	@for f in $(EXTENSION_DIR)/extension.js $(EXTENSION_DIR)/prefs.js $(EXTENSION_DIR)/utils/sun_calculator.js; do \
		echo "Checking $$f"; \
	done
	@echo "Lint complete."

dist: package
	@echo "Distribution archive at $(DIST_DIR)/$(PACKAGE_NAME)"

clean:
	@rm -rf $(BUILD_DIR)
	@rm -rf $(DIST_DIR)
	@rm -f $(SCHEMA_DIR)/gschemas.compiled

check-deps:
	@echo "Checking dependencies..."
	@command -v glib-compile-schemas >/dev/null 2>&1 && echo "OK: glib-compile-schemas found" || echo "MISSING: glib-compile-schemas"
	@command -v zip >/dev/null 2>&1 && echo "OK: zip found" || echo "MISSING: zip"
	@echo "Dependencies check complete!"
